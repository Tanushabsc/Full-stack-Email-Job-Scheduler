import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";

import { prisma } from "../config/db";
import { env } from "../config/env";

export const authRouter = Router();

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile: Profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error("Google email not available"));
          }

          const user = await prisma.user.upsert({
            where: { googleId: profile.id },
            update: {
              name: profile.displayName,
              email,
              avatarUrl: profile.photos?.[0]?.value,
            },
            create: {
              googleId: profile.id,
              name: profile.displayName,
              email,
              avatarUrl: profile.photos?.[0]?.value,
            },
          });

          if (
            (await prisma.sender.count({
              where: { userId: user.id },
            })) === 0
          ) {
            const service = await import("../services/ethereal.service");

            const a = await service.createEtherealSender();
            const b = await service.createEtherealSender();

            await prisma.sender.createMany({
              data: [
                {
                  userId: user.id,
                  email: a.user,
                  name: user.name,
                  smtpUser: a.user,
                  smtpPass: a.pass,
                },
                {
                  userId: user.id,
                  email: b.user,
                  name: user.name,
                  smtpUser: b.user,
                  smtpPass: b.pass,
                },
              ],
            });
          }

          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );
}

authRouter.get("/google", (req, res, next) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      message: "Google OAuth is not configured",
    });
  }

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${env.FRONTEND_URL}/login?error=google`,
  }),
  (req, res) => {
    (req.session as any).userId = (req.user as any).id;
    res.redirect(`${env.FRONTEND_URL}/dashboard`);
  }
);

authRouter.get("/me", async (req, res) => {
  const userId = (req.session as any)?.userId;

  if (!userId) {
    return res.status(401).json({ authenticated: false });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    return res.status(401).json({ authenticated: false });
  }

  res.json({
    authenticated: true,
    user,
  });
});

authRouter.post("/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});