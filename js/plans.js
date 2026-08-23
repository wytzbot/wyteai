// ---------------------------------------------------------------------------
// Plan data — mirrors lib/plans.dart
// ---------------------------------------------------------------------------
export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: "₦0",
    credits: 5,
    cadence: "per day",
    tagline: "Explore Wyte AI.",
    features: [
      "5 generations per day",
      "Wyte Auto model",
      "Standard quality",
      "Basic prompt enhancement",
      "Suggestions & basic templates",
      "Basic gallery and history",
      "Standard variations",
      "Basic expense tracking",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "₦10,000 / $10",
    credits: 500,
    cadence: "per month",
    tagline: "Create without limits getting in your way.",
    features: [
      "500 creative credits monthly",
      "All 5 AI models",
      "Wyte Auto model routing",
      "HD generation",
      "Advanced editing",
      "Image-to-image & reference images",
      "Batch generation",
      "Campaign Mode",
      "Brand Memory",
      "Character consistency",
      "Pro templates",
      "Advanced prompt engine",
      "Priority generation",
      "Extended history",
    ],
  },
};

export const CREDIT_COST = {
  standard: 1,
  premium: 2,
  hd: 2,
  advancedEdit: 2,
  character: 2,
  campaignAsset: 1,
  batch4: 4,
};
