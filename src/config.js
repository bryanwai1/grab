// Event settings. Edit this file to rebrand the site for another event.

export const EVENT = {
  name: "Grab House Challenge",
  year: "2026",
  dateLong: "Saturday, 14 March 2026",
  dateShort: "14 Mar 2026",
  venue: "Grab Malaysia HQ, Petaling Jaya",
  doorsOpen: "08:00",
  gift: "Door gift",
};

export const HOUSES = [
  { key: "blue", name: "Blue", hex: "#0B7FD4" },
  { key: "red", name: "Red", hex: "#E8382F" },
  { key: "green", name: "Green", hex: "#00B14F" },
  { key: "yellow", name: "Yellow", hex: "#F2A900" },
];

// Placeholder list - replace with the client's real departments.
export const DEPARTMENTS = [
  "Operations",
  "Engineering",
  "Product",
  "Marketing",
  "Sales",
  "Finance",
  "People & Culture",
  "Legal & Compliance",
  "Customer Experience",
  "Driver & Merchant Ops",
  "Other",
];

export const CHALLENGES = [
  { key: "fitness", name: "Fitness Challenge", type: "time", metric: "time", metricNote: "Best combined time - fastest wins", blurb: "Six timed stations - rowing, box jumps, battle ropes, wall balls, sled push and the plank hold. The clock runs from the first rep to the last.", venue: "Hall A, East Deck", time: "09:30", lead: true },
  { key: "obstacle", name: "Obstacles", type: "points", metric: "points", metricNote: "Time-adjusted points", blurb: "A 400 m team course. Fastest clean run per wave scores highest.", venue: "Outdoor Field", time: "11:15" },
  { key: "bingo", name: "Bingo Dash", type: "points", metric: "squares", metricNote: "Squares completed of 24", blurb: "Twenty-four squares hidden across the campus. Scan to claim.", venue: "Level 3 Atrium", time: "14:00" },
];

export const RANK_POINTS = [4, 3, 2, 1];

export const ITINERARY = [
  { time: "08:00", name: "Doors open and check-in", note: "Scan your QR at the lobby desk, then collect your door gift." },
  { time: "09:00", name: "Opening and house call", note: "Main Hall. All four houses assemble." },
  { time: "09:30", name: "Fitness Challenge", note: "Hall A, East Deck - waves 1 to 4." },
  { time: "11:15", name: "Obstacles", note: "Outdoor Field. Wet shoes guaranteed." },
  { time: "12:45", name: "Lunch", note: "Level 1 canteen and the food trucks out front." },
  { time: "14:00", name: "Bingo Dash", note: "Campus-wide. Ends the moment the horn goes." },
  { time: "16:00", name: "Prize giving", note: "Three winners - one per challenge. Main Hall." },
];

// Admin password. Set REACT_APP_ADMIN_PASSWORD in Vercel for the real event.
export const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || "grab2026";
// Staff PIN for the check-in and gift counter screens.
export const STAFF_PIN = process.env.REACT_APP_STAFF_PIN || "1234";
