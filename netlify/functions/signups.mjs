import { allSignups, tally, signupStore, json } from "./lib/store.mjs";
import { EVENT } from "./lib/config.mjs";

// Admin endpoint. Requires the ADMIN_PASSWORD environment variable in Netlify.
//   GET    /.netlify/functions/signups            -> all sign-ups + totals
//   DELETE /.netlify/functions/signups?key=...    -> remove one (frees its spots and dish)
export default async (req) => {
  const expected = (globalThis.Netlify?.env?.get("ADMIN_PASSWORD") ?? process.env.ADMIN_PASSWORD ?? "").trim();
  if (!expected) return json({ error: "ADMIN_PASSWORD is not set on this site." }, 500);
  if (req.headers.get("x-admin-password") !== expected) return json({ error: "Wrong password." }, 401);

  if (req.method === "DELETE") {
    const key = new URL(req.url).searchParams.get("key");
    if (!key) return json({ error: "Missing key." }, 400);
    await signupStore().delete(key);
    return json({ ok: true });
  }

  const signups = await allSignups();
  const t = tally(signups);
  return json({ cap: EVENT.volunteerCap, maxGroups: EVENT.maxGroups, groups: t.groups, people: t.people, spotsLeft: t.spotsLeft, dishes: t.dishes, signups });
};
