
# ReachInbox – Full-stack Email Job Scheduler
<img width="1920" height="1080" alt="Screenshot (55)" src="https://github.com/user-attachments/assets/71912fed-b288-40a3-b0e7-598e0ec42c62" />

A production-oriented take-home implementation using **TypeScript, Express, PostgreSQL, BullMQ, Redis, Elasticsearch, React, Tailwind, Google OAuth, Slack OAuth and Ethereal SMTP**.

## Architecture

```text
React + Tailwind
      |
      | REST + cookie session
      v
Express API --------------------> PostgreSQL (users, campaigns, emails, senders, Slack tokens)
      |
      +----> Redis/BullMQ delayed jobs ----> Worker(s) ----> Ethereal SMTP
      |                                      |
      |                                      +----> Elasticsearch index
      |                                      +----> Redis atomic rate-limit windows
      |
      +----> Bull Board (/admin/queues)
      |
      +----> Slack OAuth + rate-limit notification
      +----> Google OAuth
```

### Scheduling
Each recipient is persisted first and gets a BullMQ delayed job. BullMQ stores delayed jobs in Redis, so a Node process restart does not recreate the schedule. The worker loads the email row and uses an atomic DB state transition (`scheduled -> sending`) before SMTP. This makes retries/idempotency safe.

<img width="1920" height="1080" alt="Screenshot (58)" src="https://github.com/user-attachments/assets/535df188-2054-41f3-8efd-4a890208e278" />
<img width="1920" height="1080" alt="Screenshot (59)" src="https://github.com/user-attachments/assets/39d93339-58dc-4fed-8cb3-55ccac86b60e" />

### Rate limiting
The worker uses a Redis Lua script to reserve a slot in a sender/hour bucket. The bucket key is `rate:{senderId}:{UTC-hour}`. If the configured hourly cap is reached, the job is delayed until the next UTC hour. A second Redis key tracks the last send timestamp for a sender, enforcing the configured minimum delay between sends across worker instances.

### Concurrency
`WORKER_CONCURRENCY` is configurable. Redis atomic operations and the DB state transition make parallel workers safe.

### Search
Every successful/failed send is indexed in Elasticsearch. The dashboard's search endpoint queries recipient, subject and status.

### Restart behavior
PostgreSQL and Redis are persistent when run through Docker volumes. BullMQ delayed jobs remain in Redis. Email records remain in PostgreSQL. On restart, the API does not enqueue duplicates; scheduling is idempotent using the email UUID as the BullMQ `jobId`.

## Quick start

### 1. Requirements
- Node.js 20+
- Docker Desktop
- Google OAuth credentials (real login)
- Slack app credentials (real Connect Slack flow)

### 2. Start infrastructure

```bash
docker compose up -d
```

### 3. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

In another terminal:

```bash
cd backend
npm run worker
```

Bull Board: `http://localhost:4000/admin/queues`

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## OAuth setup

### Google
Create a Web application OAuth client in Google Cloud Console. Add:
- Authorized JavaScript origin: `http://localhost:5173`
- Authorized redirect URI: `http://localhost:4000/auth/google/callback`

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Slack
Create a Slack app and enable OAuth v2. Add redirect URL:
`http://localhost:4000/auth/slack/callback`

Request scopes `chat:write,incoming-webhook`. Set `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET`.

### Ethereal
No paid SMTP account is required. On startup, if `ETHEREAL_USER` / `ETHEREAL_PASS` are blank, the backend creates an Ethereal test account with Nodemailer. The worker logs the Ethereal preview URL for each send.

## Important environment variables
See `backend/.env.example`.

## Demo checklist (under 5 minutes)
1. Google login.
2. Connect Slack.
3. Compose an email, upload a CSV, set start time/delay/hourly cap.
4. Schedule.
5. Show Scheduled tab.
6. Open Bull Board.
7. Wait for a send and show Sent tab + Ethereal preview URL in worker terminal.
8. Restart the API/worker and show the future job remains in Redis/Bull Board and sends later.
9. For a fast rate-limit demo, set `MAX_EMAILS_PER_HOUR=2` and upload 3+ recipients. The third job moves to the next hour and a Slack notification is sent when the cap is hit.

## Assumptions / trade-offs
- UTC is used for rate-limit hour windows and stored timestamps; browser-local datetime inputs are converted to ISO timestamps by the frontend.
- Ethereal is intentionally a test SMTP service; it does not deliver to real inboxes.
- Google and Slack credentials are environment secrets and cannot be included in a repository.
- Elasticsearch is configured without security for local development only.
- A sender pool is seeded automatically with two Ethereal sender identities after the first authenticated user is created.
