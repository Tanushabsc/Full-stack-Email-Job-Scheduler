# Final submission checklist

- [ ] Add real Google OAuth credentials to `backend/.env`.
- [ ] Add real Slack OAuth credentials to `backend/.env`.
- [ ] Run `docker compose up -d`.
- [ ] Run Prisma migration.
- [ ] Start API and worker in separate terminals.
- [ ] Start frontend.
- [ ] Test Google login.
- [ ] Test Slack Connect/Disconnect.
- [ ] Upload a CSV containing at least 3 email addresses.
- [ ] Schedule one email for 30–60 seconds in the future.
- [ ] Verify Bull Board shows the delayed job.
- [ ] Verify worker prints the Ethereal preview URL.
- [ ] Verify Sent tab.
- [ ] Set a small hourly limit for the rate-limit demo.
- [ ] Restart API/worker while a future job is waiting and show that it remains in Redis/Bull Board.
- [ ] Create the private GitHub repository and grant access to `Mitrajit` and `Yadav036`.
- [ ] Record a <=5 minute demo video.
