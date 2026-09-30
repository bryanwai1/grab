# Grab House Challenge - RSVP, check-in, door gift & live scores

## Pages
- `#/rsvp` RSVP: name, department, email, house (Blue/Red/Green/Yellow), phone -> QR pass
- `#/pass/<code>` guest pass (QR, status, save image, slide-to-claim gift)
- `#/staff` -> `#/checkin` lobby scanner, `#/gift` gift counter (one claim per pass)
- `#/scores` live scoreboard (TV screen)
- `#/admin` overview, guest list (search/filter/CSV/reset), scoring, ledger

## Run
    npm install && npm start

With no env vars it runs in **demo mode** (data stays in that browser).
For multi-device use, create a Supabase project, run `supabase/schema.sql`, and set
the env vars in `.env.example` on Vercel. Departments, date, venue live in `src/config.js`.
