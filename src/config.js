// Event settings. Edit this file to rebrand the site for another event.

// Public address used for every link inside emails (pass, agenda, logo).
// Never a Vercel preview address - those ask for a Vercel login.
export const SITE_URL = ((typeof process !== "undefined" && process.env && (process.env.REACT_APP_SITE_URL || process.env.SITE_URL)) || "https://grab-day.vercel.app").replace(/\/+$/, "");

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
  // "your house colour" is replaced with the guest's colour (e.g. "red").
  dressCode: [
    "Hari Sukan T-shirt in your house colour",
    "Comfortable sportswear",
    "Sports shoes",
  ],
  spectatorDressCode: [
    "Comfortable activewear",
    "Sports shoes recommended",
  ],
  // Email wording from Joanne's "Participant QR Email Template" and "Spectator Email Draft".
  eventTime: "8.00am - 4.00pm",
  counterTime: "8.00am - 8.30am",
  qrNote: "Save a **screenshot of your QR code** in your phone and show it to our event crew at the **lobby registration counter** during check-in on the event day.",
  obstacleRemark: "For participants joining the Obstacle Challenge, it is recommended to wear **long pants** and bring **1 set of clean clothes**.",
  parkingNote: "Parking space is limited. You are recommended to carpool or share Grab rides.",
  // Weekday parking rates only (event is on a Friday).
  parkingRates: [
    ["First 15 minutes", "Free"],
    ["First 3 hours (6.01am - 7.00pm)", "RM3.00"],
    ["Every subsequent hour and part thereof", "RM1.50"],
    ["7.00pm - 6.01am (per entry)", "RM3.00"],
  ],
  storageNote: "A designated space is available for bag storage; however, it is not locked or secured. We strongly recommend keeping your personal belongings with you. Please note that we are not responsible for any lost or missing items.",
  // [time, item]. The lunch row gets the activities list below it.
  emailItinerary: [
    ["8:00 AM", "Breakfast"],
    ["8:30 AM", "Registration Counter Close"],
    ["8:45 AM", "Gather at Lobby for March In"],
    ["9:00 AM", "Opening Ceremony Start"],
    ["10:30 AM", "Official Flag-Off & Competition Begins"],
    ["12:30 PM", "Lunch Break & Friday Prayers"],
    ["2:30 PM", "Let the Battle Begin! Team War Cry"],
    ["3:30 PM", "Award Ceremony"],
    ["4:00 PM", "End of event"],
  ],
  spectatorItinerary: [
    ["8:00 AM", "Breakfast"],
    ["8:30 AM", "Registration Cutoff"],
    ["8:45 AM", "Spectators to Be Seated at Stadium Seating Area for Opening Ceremony"],
    ["9:00 AM", "Opening Ceremony Start"],
    ["10:00 AM", "Official Flag-Off & Competition Begins"], // Joanne's spectator draft says 10.00am; participant one says 10.30am
    ["12:30 PM", "Lunch Break & Friday Prayers"],
    ["2:30 PM", "Let the Battle Begin! Team War Cry"],
    ["3:30 PM", "Award Ceremony"],
    ["4:00 PM", "End of event"],
  ],
  lunchRow: "Lunch Break & Friday Prayers",
  lunchActivities: [
    ["📸 Strike a Pose! – Photobooth", "12.00 PM – 2.30 PM"],
    ["🎯 Take on the Mini Station Challenge!", "12.30 PM – 2.30 PM"],
    ["💆 Relax & Recharge – Massage Station", "12.45 PM – 2.15 PM"],
    ["💪 Know Your Body Better – BMI Check by Celebrity Fitness", "12.00 PM – 2.30 PM"],
  ],
  bonus: "Teams with full attendance before **8:30 AM** will earn an additional",
  bonusPoints: "300 points.",
  // Lunch redemption (works like the door gift at Soilbuild): staff scan the QR at the
  // food counter. Must be checked in first; one lunch per pass.
  gift: "Lunch",
  hasGift: true,
};

// House names from Joanne. `colour` is the T-shirt colour; `key` is what the database stores
// (Knights keep the old "green" key so existing RSVPs and the database check still work).
// Spectators: attend, eat, but take part in no activity and earn no points.
export const SPECTATOR = { key: "spectator", name: "Spectator", colour: "", hex: "#0B5D35" };

export const HOUSES = [
  { key: "blue", name: "Blue Vikings", colour: "Blue", hex: "#0B7FD4" },
  { key: "red", name: "Red Samurais", colour: "Red", hex: "#E8382F" },
  { key: "green", name: "Purple Knights", colour: "Purple", hex: "#7B3FBF" },
  { key: "yellow", name: "Yellow Gladiators", colour: "Yellow", hex: "#E0A100" },
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

// Point system from Joanne's sheet. `points` = what 1st, 2nd, 3rd, 4th place earn.
// type "time": fastest time wins. "points": highest total wins. "winner": the marshal picks the winning house.
export const CHALLENGES = [
  { key: "fitness", name: "Fitness Challenge", short: "Fitness", type: "time", metric: "time", metricNote: "Best combined time - fastest wins", points: [500, 300, 200, 100], blurb: "Six timed stations - rowing, box jumps, battle ropes, wall balls, sled push and the plank hold. The clock runs from the first rep to the last.", venue: "Competition zone", time: "10:30", lead: true },
  { key: "obstacle", name: "Obstacle Challenge", short: "Obstacle", type: "time", metric: "time", metricNote: "Best time - fastest wins", points: [500, 300, 200, 100], blurb: "A team obstacle course. The fastest clean run wins.", venue: "Competition zone", time: "10:30" },
  { key: "bingo", name: "Bingo Rush", short: "Bingo", type: "points", metric: "squares", metricNote: "Squares completed", pay: "place", points: [500, 300, 200, 100], blurb: "Squares hidden around the venue. Complete the most to win.", venue: "Competition zone", time: "10:30" },
  { key: "warcry", name: "War Cry", short: "War Cry", type: "winner", metric: "winner", metricNote: "Judges pick the winning house", points: [100], blurb: "Each house performs its war cry. The judges pick the best.", venue: "Main arena", time: "09:25" },
  { key: "tugm", name: "Tug of War (Male)", short: "Tug M", type: "winner", metric: "winner", metricNote: "Winning house", points: [200], blurb: "Male teams, knockout rounds.", venue: "Level 4 Sport Hall", time: "14:45" },
  { key: "tugf", name: "Tug of War (Female)", short: "Tug F", type: "winner", metric: "winner", metricNote: "Winning house", points: [200], blurb: "Female teams, knockout rounds.", venue: "Level 4 Sport Hall", time: "14:45" },
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
  { time: "10.30am", name: "Competitions start", note: "Obstacles, Fitness Challenge and Bingo Rush. Until 12.30pm." },
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
