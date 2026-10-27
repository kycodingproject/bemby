/** Bemby pricing. One place to change prices shown across the site. */
export const PLANS = {
  trial: { id: "trial", name: "Trial", price: "$4.99", period: "first month", texts: 0, summary: "Instagram & Messenger DMs. Becomes Bemby Social after the first month." },
  social: { id: "social", name: "Bemby Social", price: "$19.99", period: "/ month", texts: 0, summary: "Bemby answers and books on Instagram & Messenger DMs." },
  pro: { id: "pro", name: "Bemby Pro", price: "$39.99", period: "/ month", texts: 1000, summary: "Everything in Social, plus your own business phone number and texting." },
} as const;

export type PlanId = keyof typeof PLANS;
export const planOf = (id: string | null | undefined) => PLANS[(id as PlanId) in PLANS ? (id as PlanId) : "trial"];

export const NUMBER_APPROVAL = "Carrier approval usually takes 2–4 days";
export const EXTRA_TEXTS = "Need more? Add 500 texts for $10.";
