# Stewpot Thanksgiving Volunteer Sign-Up

Volunteer sign-up form for Stewpot's Thanksgiving dining experience. Static HTML + Netlify Functions + Netlify Blobs (no build framework).

## What the form does

- **Individual or group** – choosing "A group" reveals group name, size (2–3, including the leader) and a name field per extra member. At most **5 group sign-ups** are accepted (`maxGroups`); after that the group option is disabled and individuals can still sign up.
- **Volunteer cap (35 people)** – counted by headcount, so a group of 3 uses 3 spots. Group sizes larger than the remaining spots aren't offered; with 1 spot left the group option is disabled. At 0 spots the form is replaced by a "spots are filled" message.
- **Dishes** – every sign-up brings one menu item. Each dish shows how much is still needed; fully covered dishes are greyed out. Choosing a dish shows its pan size/details and a quantity picker capped by what's still needed and a per-sign-up maximum.
- **Duty preferences** – optional checkboxes for the five key duties.
- **Server-side checks** – every rule is re-checked in `submit` against live data (cap, group size, dish remaining, duplicate email). A honeypot field filters basic bots.

## Confirmation email

After a successful sign-up the browser sends a plain-text confirmation via **EmailJS**, using the same service and client template as the intake form (`template_slosb0f`, params `to_email`, `to_name`, `subject`, `message`). It includes date, arrival time, the dish, the address/map link, parking and door instructions, and the phone number. The same details show on the thank-you screen. Address, parking and phone live in `config.mjs`.

If EmailJS has **Allowed origins** restricted (EmailJS dashboard → Account → Security), add this site's domain there or the email will be blocked.

## Files

```
public/index.html, form.js, styles.css   the form
public/admin.html                        staff view: totals, sign-up list, remove, CSV export
netlify/functions/lib/config.mjs         ← EDIT HERE: date, cap, group max, dishes, quantities
netlify/functions/availability.mjs       GET  live counts (the form builds itself from this)
netlify/functions/submit.mjs             POST a sign-up
netlify/functions/signups.mjs            admin GET / DELETE (needs ADMIN_PASSWORD)
```

## Deploy

1. Push this folder to a new GitHub repo.
2. In Netlify: **Add new site → Import from Git**, pick the repo. `netlify.toml` already sets publish dir `public`, functions dir and `npm install`.
3. **Site configuration → Environment variables**: add `ADMIN_PASSWORD`. Then redeploy.
4. Staff view: `https://<site>/admin.html`.

Sign-ups are stored in the Blobs store `thanksgiving-signups` (one entry per sign-up, strong consistency), so submissions never trigger a redeploy.

## Changing things

- Quantities, date, cap or group max: edit `config.mjs` and push. Existing sign-ups stay.
- Close sign-ups early: set `closeAt` in `config.mjs`.
- Cancellation: remove the sign-up in `admin.html`. Its spots and dish quantity open back up immediately.
