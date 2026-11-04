// Single source of truth for the event. Edit numbers here; the form reads them
// from the /availability function, so nothing else needs to change.

export const EVENT = {
  title: "A Seat at the Table: Stewpot's Thanksgiving Celebration",
  dateLabel: "Thursday, November 26, 2026",
  arrival: "10:45 a.m.",
  serviceWindow: "10:45 a.m. – 1:30 p.m.",
  location: "Stewpot Community Kitchen",
  volunteerCap: 35,      // total people (a group of 3 counts as 3)
  maxGroupSize: 3,
  maxGroups: 5,          // most group sign-ups accepted (individuals don't count toward this)
  closeAt: null,         // optional ISO string, e.g. "2026-11-24T23:59:00-06:00"
  address: ["1100 West Capitol Street", "Jackson, MS 39203"],
  mapUrl: "https://www.google.com/maps/search/1100+West+Capitol+Street+Jackson,+MS+39203",
  phone: "601-808-3050",
  contact: { name: "Contyna McNealy", title: "Director of Volunteer Programs", email: "cmcnealy@stewpot.org" },
  parking: "Please park in the lot reserved for volunteers. The lot is gated and will have a few Stewpot vehicles parked inside. As a landmark, it's located right next to the old Masonic Temple building on the corner of Monument and Capitol Streets.",
  arrivalNote: "Once you arrive, ring the doorbell beside the white double doors, and someone will let you in.",
};

export const DUTIES = [
  "Serving line",
  "Prepping drinks",
  "Taking orders",
  "Setting tables",
  "Cleaning tables during and after service",
];

const FULL_PAN = '20 3/4" × 12 3/4" × 2 1/5" full-size disposable aluminum steam roaster pan';

// needed  = total units Stewpot needs
// unit    = what one unit is (shown in the quantity picker)
// maxPer  = most units a single sign-up can claim (keeps dishes spread across groups)
export const DISHES = [
  { id: "sweet-tea",       name: "Sweet tea",          needed: 20, unit: "gallon",          unitPlural: "gallons",          maxPer: 5,  details: "Brewed and sweetened, in gallon jugs." },
  { id: "candied-yams",    name: "Candied yams",       needed: 5,  unit: "full-size pan",   unitPlural: "full-size pans",   maxPer: 2,  details: FULL_PAN },
  { id: "potato-salad",    name: "Potato salad",       needed: 3,  unit: "full-size pan",   unitPlural: "full-size pans",   maxPer: 2,  details: FULL_PAN },
  { id: "collard-greens",  name: "Collard greens",     needed: 5,  unit: "full-size pan",   unitPlural: "full-size pans",   maxPer: 2,  details: FULL_PAN },
  { id: "green-beans",     name: "Green beans",        needed: 5,  unit: "full-size pan",   unitPlural: "full-size pans",   maxPer: 2,  details: FULL_PAN },
  { id: "black-eyed-peas", name: "Black-eyed peas",    needed: 5,  unit: "full-size pan",   unitPlural: "full-size pans",   maxPer: 2,  details: FULL_PAN },
  { id: "cornbread",       name: "Cornbread muffins",  needed: 20, unit: "pack of 12",      unitPlural: "packs of 12",      maxPer: 5,  details: "Packs of 12 muffins." },
  { id: "rolls",           name: "Ready-serve rolls",  needed: 20, unit: "pack of 12",      unitPlural: "packs of 12",      maxPer: 5,  details: "Packs of 12 rolls." },
  { id: "cranberry-sauce", name: "Cranberry sauce",    needed: 3,  unit: "half-size pan",   unitPlural: "half-size pans",   maxPer: 2,  details: '11.8" × 9.4" × 2.4" half-size aluminum pan.' },
  { id: "chocolate-cake",  name: "Chocolate cake",     needed: 6,  unit: "cake",            unitPlural: "cakes",            maxPer: 2,  details: "Whole frosted cakes — we'll slice them the day of." },
  { id: "yellow-cake",     name: "Yellow cake",        needed: 6,  unit: "cake",            unitPlural: "cakes",            maxPer: 2,  details: "Whole frosted cakes — we'll slice them the day of." },
];

