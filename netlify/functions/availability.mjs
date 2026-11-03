import { EVENT, DUTIES } from "./lib/config.mjs";
import { allSignups, tally, json, isClosed } from "./lib/store.mjs";

// GET /.netlify/functions/availability
// Returns event info plus live counts; the form builds itself from this.
export default async () => {
  try {
    const t = tally(await allSignups());
    return json({
      event: EVENT,
      duties: DUTIES,
      closed: isClosed() || t.spotsLeft === 0,
      spotsLeft: t.spotsLeft,
      groupsLeft: t.groupsLeft,
      dishes: t.dishes.map(({ id, name, unit, unitPlural, details, needed, remaining, maxPer }) => ({
        id, name, unit, unitPlural, details, needed, remaining, maxPer,
      })),
    });
  } catch (err) {
    console.error("availability failed", err);
    return json({ error: "Could not load availability." }, 500);
  }
};
