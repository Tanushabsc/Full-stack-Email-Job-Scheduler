import { Worker, Job } from "bullmq";
import nodemailer from "nodemailer";

import { redisConnection } from "../config/redis";
import { prisma } from "../config/db";
import { EMAIL_QUEUE } from "../config/queue";

const concurrency = Number(
  process.env.WORKER_CONCURRENCY || 5
);

const RATE_WINDOW_SECONDS = 60 * 60;

async function incrementRateCounter(
  senderId: string,
  limit: number
): Promise<boolean> {
  const key = `email-rate:${senderId}`;

  const script = `
    local current = redis.call("GET", KEYS[1])

    if not current then
      redis.call("SET", KEYS[1], 1, "EX", ARGV[1])
      return 1
    end

    if tonumber(current) >= tonumber(ARGV[2]) then
      return 0
    end

    return redis.call("INCR", KEYS[1])
  `;

  const result = await redisConnection.eval(
    script,
    1,
    key,
    RATE_WINDOW_SECONDS,
    limit
  );

  return Number(result) === 1;
}

async function sendEmail(
  sender: {
    email: string;
    name: string | null;
    smtpUser: string;
    smtpPass: string;
  },
  recipient: string,
  subject: string,
  body: string
) {
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: sender.smtpUser,
      pass: sender.smtpPass,
    },
  });

  await transporter.sendMail({
    from: sender.name
      ? `"${sender.name}" <${sender.email}>`
      : sender.email,
    to: recipient,
    subject,
    text: body,
    html: body.replace(/\n/g, "<br>"),
  });
}

const worker = new Worker(
  EMAIL_QUEUE,
  async (job: Job) => {
    const emailId = String(job.data.emailId);

    console.log(
      `Processing email job ${job.id} for email ${emailId}`
    );

    const email = await prisma.email.findUnique({
      where: {
        id: emailId,
      },
      include: {
        sender: true,
        campaign: true,
      },
    });

    if (!email) {
      throw new Error(
        `Email ${emailId} does not exist`
      );
    }

    if (email.status === "sent") {
      console.log(
        `Email ${emailId} already sent. Skipping duplicate.`
      );

      return {
        skipped: true,
        reason: "already-sent",
      };
    }

    if (!email.sender) {
      throw new Error(
        `No sender configured for email ${emailId}`
      );
    }

    const now = Date.now();
    const scheduledTime =
      email.scheduledAt.getTime();

    if (scheduledTime > now) {
      const remaining =
        scheduledTime - now;

      await job.moveToDelayed(
        scheduledTime,
        job.token
      );

      console.log(
        `Email ${emailId} delayed for ${remaining}ms`
      );

      return {
        delayed: true,
      };
    }

    const hourlyLimit =
      email.campaign?.hourlyLimit ??
      Number(
        process.env.MAX_EMAILS_PER_HOUR || 200
      );

    const allowed =
      await incrementRateCounter(
        email.senderId,
        hourlyLimit
      );

    if (!allowed) {
      const nextHour =
        Date.now() +
        60 * 60 * 1000;

      await prisma.email.update({
        where: {
          id: email.id,
        },
        data: {
          scheduledAt: new Date(nextHour),
        },
      });

      throw new Error(
        `Hourly rate limit of ${hourlyLimit} reached for sender ${email.sender.email}. Email rescheduled.`
      );
    }

    await prisma.email.update({
      where: {
        id: email.id,
      },
      data: {
        status: "sending",
      },
    });

    try {
      await sendEmail(
        {
          email: email.sender.email,
          name: email.sender.name,
          smtpUser: email.sender.smtpUser,
          smtpPass: email.sender.smtpPass,
        },
        email.recipient,
        email.subject,
        email.body
      );

      const sentEmail =
        await prisma.email.update({
          where: {
            id: email.id,
          },
          data: {
            status: "sent",
            sentAt: new Date(),
            error: null,
          },
        });

      console.log(
        `Email ${email.id} sent successfully to ${email.recipient}`
      );

      return {
        success: true,
        emailId: sentEmail.id,
        recipient: email.recipient,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      await prisma.email.update({
        where: {
          id: email.id,
        },
        data: {
          status: "failed",
          failedAt: new Date(),
          error: message,
        },
      });

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency,
  }
);

worker.on("completed", (job) => {
  console.log(
    `Job ${job.id} completed successfully`
  );
});

worker.on("failed", (job, error) => {
  console.error(
    `Job ${job?.id ?? "unknown"} failed:`,
    error.message
  );
});

worker.on("error", (error) => {
  console.error(
    "Email worker error:",
    error
  );
});

console.log(
  `Email worker started with concurrency ${concurrency}`
);

async function shutdown() {
  console.log(
    "Shutting down email worker..."
  );

  await worker.close();
  await prisma.$disconnect();

  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);