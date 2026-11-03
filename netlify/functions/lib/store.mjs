import { getStore } from "@netlify/blobs";
import { EVENT, DISHES } from "./config.mjs";

// Strong consistency so a sign-up is counted the moment it's saved
// (avoids the eventual-consistency gaps seen with list reads).
export const signupStore = () => getStore({ name: "thanksgiving-signups", consistency: "strong" });

export async function allSignups() {
  const store = signupStore();
  const { blobs } = await store.list();
  const rows = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
  return rows
    .map((r, i) => (r ? { ...r, key: blobs[i].key } : null))
    .filter(Boolean)
    .sort((a, b) => String(a.submittedAt || "").localeCompare(String(b.submittedAt || "")));
}

export function tally(signups) {
  const people = signups.reduce((n, s) => n + (Number(s.headcount) || 0), 0);
  const claimed = Object.fromEntries(DISHES.map((d) => [d.id, 0]));
  for (const s of signups) if (s.dishId in claimed) claimed[s.dishId] += Number(s.dishQty) || 0;
  return {
    people,
    spotsLeft: Math.max(0, EVENT.volunteerCap - people),
    dishes: DISHES.map((d) => ({ ...d, claimed: claimed[d.id], remaining: Math.max(0, d.needed - claimed[d.id]) })),
  };
}

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export const isClosed = () => !!EVENT.closeAt && Date.now() > Date.parse(EVENT.closeAt);
