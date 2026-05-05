export const serviceCategories = [
  {
    title: "Home Repairs",
    summary: "Drywall, doors, trim, cabinets, fixtures, minor carpentry, and punch-list repairs.",
    items: ["Drywall repair", "Door repair", "Trim and baseboards", "Fixture replacement", "Cabinet adjustments", "Minor carpentry"],
  },
  {
    title: "Property Maintenance",
    summary: "Rental turns, preventive maintenance, seasonal work, and commercial support.",
    items: ["Rental maintenance", "Move-in / move-out repairs", "Preventive maintenance", "Landlord support", "Commercial maintenance"],
  },
  {
    title: "Painting & Finishing",
    summary: "Interior painting, patching, caulking, touch-ups, surface prep, and clean finish work.",
    items: ["Interior painting", "Touch-ups", "Patching", "Caulking", "Surface preparation", "Finish work"],
  },
  {
    title: "Fixture Work",
    summary: "Plumbing-related and electrical-related fixture replacement and install support.",
    items: ["Faucets", "Toilets", "Garbage disposals", "Light fixtures", "Ceiling fans", "Switches and outlets"],
  },
  {
    title: "Installations & Improvements",
    summary: "Shelving, TV mounting, hardware installation, appliance support, and general upgrades.",
    items: ["Shelving", "TV mounting", "Hardware installation", "Appliance support", "Minor remodel support"],
  },
];

export const jobStatuses = [
  "New request",
  "Needs review",
  "Quote in progress",
  "Quote sent",
  "Awaiting client response",
  "Quote accepted",
  "Deposit paid",
  "Scheduled",
  "In progress",
  "Waiting on materials",
  "Waiting on client",
  "Completed",
  "Invoiced",
  "Paid",
  "Closed",
  "Canceled",
];

export const portalCards = [
  { label: "Requests", value: "4", tone: "rust", detail: "2 need admin review" },
  { label: "Quotes", value: "$8.4k", tone: "tan", detail: "Awaiting client response" },
  { label: "Scheduled", value: "6", tone: "black", detail: "This week" },
  { label: "Invoices", value: "$2.1k", tone: "rust", detail: "Open balance" },
];

export const galleryProjects = [
  { title: "Rental Turn Punch List", category: "Property Maintenance", description: "Doors adjusted, drywall patched, fixtures replaced, and touch-up paint completed before tenant move-in." },
  { title: "Interior Refresh", category: "Painting & Finishing", description: "Wall repairs, caulking, surface prep, and clean paint lines for a brighter living area." },
  { title: "Fixture Upgrade", category: "Installations", description: "Ceiling fan, cabinet hardware, faucet, and bathroom fixture improvements handled in one visit." },
  { title: "Commercial Maintenance Visit", category: "Small Business", description: "Preventive checklist, minor repairs, hardware adjustments, and issue documentation for the property manager." },
];
