# Dashboard Design Spec

The supplied assignment mentions a Figma file but no Figma URL was included in the prompt. The project therefore includes an original, Figma-style implementation rather than pretending to have copied an unavailable file.

## Visual system
- Primary: indigo/purple action color
- Background: very light slate
- Cards: white with 1px borders and rounded 16–24px corners
- Typography: system UI / Inter-like stack
- Dense but readable email tables
- Responsive sidebar + mobile menu

## Screens
1. Google login / welcome screen
2. Dashboard overview with Scheduled / Sent tabs
3. Compose modal
4. BullMQ monitor via Bull Board
5. Slack connection panel

The React components are intentionally reusable and the layout is close to a typical modern SaaS email-operations dashboard.
