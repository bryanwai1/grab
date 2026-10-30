// Event settings. Edit this file to rebrand the site for another event.

export const EVENT = {
  name: "Grab MY Hari Sukan",
  year: "2026",
  dateLong: "Friday, 20 November 2026",
  dateShort: "20 Nov 2026",
  venue: "Arena Sukan Kuala Lumpur (ASKL)",
  address: "210, Jalan Ayer Jerneh, Mukim, Setapak, 53200 Kuala Lumpur",
  doorsOpen: "08:00",
  registration: "8.00am (sharp)",
  // Shown as a "Dress code" box in the email, on the pass and on the agenda.
  dressCode: [
    "Hari Sukan T-shirt in your house colour",
    "Comfortable sportswear",
    "Sports shoes for the activities",
  ],
  gift: "Door gift",
  // No door gift this year: hides the gift counter, gift status and gift wording everywhere.
  hasGift: false,
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

// From Itinerary Hari Sukan 2026.pdf (public/itinerary-hari-sukan-2026.pdf)
export const ITINERARY_PDF = "itinerary-hari-sukan-2026.pdf";
export const ITINERARY = [
  { time: "8.00am", name: "Registration", note: "Scan your QR at the Registration Counter, lobby floor. Breakfast provided." },
  { time: "8.30am", name: "House gathering", note: "All 4 houses gather at Lobby Gate B for entry." },
  { time: "8.45am", name: "Get ready to march in", note: "" },
  { time: "9.00am", name: "Opening and welcome speech", note: "" },
  { time: "9.25am", name: "Team war cry", note: "" },
  { time: "9.45am", name: "Warm-up exercise", note: "" },
  { time: "10.00am", name: "Safety briefing and group photo", note: "" },
  { time: "10.30am", name: "Competitions start", note: "Obstacles, Fitness Challenge and Bingo Dash. Until 12.30pm." },
  { time: "12.30pm", name: "Lunch break and prayer", note: "Interactive games and photobooth at the lobby." },
  { time: "2.00pm", name: "Gather at Level 4 Sport Hall", note: "All participants." },
  { time: "2.30pm", name: "Team war cry", note: "" },
  { time: "2.45pm", name: "Tug of war", note: "" },
  { time: "3.30pm", name: "Award ceremony", note: "" },
  { time: "4.00pm", name: "End of ceremony", note: "" },
];

// Admin password. Set REACT_APP_ADMIN_PASSWORD in Vercel for the real event.
export const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || "grab2026";
// Staff PIN for the check-in and gift counter screens.
export const STAFF_PIN = process.env.REACT_APP_STAFF_PIN || "1234";
