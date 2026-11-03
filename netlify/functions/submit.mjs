import { EVENT, DISHES, DUTIES, GROUP_TYPES } from "./lib/config.mjs";
import { allSignups, tally, signupStore, json, isClosed } from "./lib/store.mjs";

const clean = (v, max = 200) => String(v ?? "").trim().slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /.netlify/functions/submit
// Re-checks every rule server-side; the browser checks are only for convenience.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let b;
  try { b = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }

  // Honeypot: bots fill hidden fields, people don't.
  if (clean(b.website)) return json({ ok: true });

  const errors = [];
  const signupType = b.signupType === "group" ? "group" : b.signupType === "individual" ? "individual" : null;
  if (!signupType) errors.push("Choose individual or group.");

  const contact = {
    firstName: clean(b.firstName, 80),
    lastName: clean(b.lastName, 80),
    email: clean(b.email, 160).toLowerCase(),
    phone: clean(b.phone, 40),
  };
  if (!contact.firstName || !contact.lastName) errors.push("Enter your first and last name.");
  if (!EMAIL.test(contact.email)) errors.push("Enter a valid email address.");
  if (contact.phone.replace(/\D/g, "").length < 10) errors.push("Enter a phone number with area code.");

  let group = null;
  let headcount = 1;
  if (signupType === "group") {
    headcount = Number(b.groupSize);
    if (!Number.isInteger(headcount) || headcount < 2 || headcount > EVENT.maxGroupSize)
      errors.push(`Groups can have 2 to ${EVENT.maxGroupSize} people (including you).`);
    const members = (Array.isArray(b.members) ? b.members : []).map((m) => clean(m, 120)).filter(Boolean);
    if (members.length !== headcount - 1) errors.push("Enter the name of each person in your group.");
    group = {
      name: clean(b.groupName, 120),
      type: GROUP_TYPES.includes(b.groupType) ? b.groupType : "",
      typeOther: b.groupType === "Other" ? clean(b.groupTypeOther, 120) : "",
      members,
    };
    if (!group.name) errors.push("Enter your group's name.");
    if (!group.type) errors.push("Choose what kind of group you are.");
    if (group.type === "Other" && !group.typeOther) errors.push("Tell us what kind of group you are.");
  }

  const duties = (Array.isArray(b.duties) ? b.duties : []).filter((d) => DUTIES.includes(d));
  const dish = DISHES.find((d) => d.id === b.dishId);
  const dishQty = Number(b.dishQty);
  if (!dish) errors.push("Choose a dish to bring.");
  else if (!Number.isInteger(dishQty) || dishQty < 1 || dishQty > dish.maxPer) errors.push("Choose how much you'll bring.");
  if (b.agree !== true) errors.push("Please confirm the arrival time and dish instructions.");

  if (errors.length) return json({ error: errors[0], errors }, 400);
  if (isClosed()) return json({ error: "Sign-ups are closed." }, 409);

  // Capacity checks against live data.
  const signups = await allSignups();
  const t = tally(signups);
  if (signups.some((s) => s.contact?.email === contact.email))
    return json({ error: "This email is already signed up. Contact Stewpot if you need to change your sign-up." }, 409);
  if (headcount > t.spotsLeft)
    return json({ error: t.spotsLeft ? `Only ${t.spotsLeft} volunteer spot${t.spotsLeft === 1 ? "" : "s"} left.` : "All volunteer spots are filled.", refresh: true }, 409);
  const live = t.dishes.find((d) => d.id === dish.id);
  if (dishQty > live.remaining)
    return json({ error: live.remaining ? `Only ${live.remaining} ${live.remaining === 1 ? dish.unit : dish.unitPlural} of ${dish.name.toLowerCase()} still needed.` : `${dish.name} is now fully covered — please pick another dish.`, refresh: true }, 409);

  const submittedAt = new Date().toISOString();
  const record = {
    submittedAt,
    signupType,
    headcount,
    contact,
    group,
    duties,
    dishId: dish.id,
    dishName: dish.name,
    dishQty,
    dishUnit: dishQty === 1 ? dish.unit : dish.unitPlural,
    notes: clean(b.notes, 1000),
  };
  const key = `${submittedAt.replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
  await signupStore().setJSON(key, record);

  return json({ ok: true, summary: { headcount, dish: `${dishQty} ${record.dishUnit} of ${dish.name.toLowerCase()}` } });
};
