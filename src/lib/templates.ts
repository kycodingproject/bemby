import type { IntakeItem } from "./types";

export interface ServiceDraft {
  name: string;
  price: string; // dollars as typed; blank = "price varies"
  minutes: number;
  deposit: string;
  intake: IntakeItem[];
}

export interface BusinessType {
  id: string;
  label: string;
  /** Things Bemby can ask for before booking; owners toggle these per service. */
  asks: IntakeItem[];
  services: { name: string; minutes: number; asks: string[] }[];
}

const photo = (key: string, label: string): IntakeItem => ({ key, label, type: "photo" });
const text = (key: string, label: string): IntakeItem => ({ key, label, type: "text" });

export const BUSINESS_TYPES: BusinessType[] = [
  {
    id: "hair",
    label: "Hair stylist",
    asks: [
      photo("current_photo", "A photo of their hair right now"),
      photo("inspo_photo", "An inspo photo of the look they want"),
      text("hair_length", "Current hair length"),
      text("color_history", "Color or chemical treatments in the last 6 months"),
      text("hair_provided", "Whether they're bringing their own hair"),
    ],
    services: [
      { name: "Silk press", minutes: 150, asks: ["current_photo", "inspo_photo", "hair_length", "color_history"] },
      { name: "Knotless braids", minutes: 360, asks: ["inspo_photo", "hair_length", "hair_provided"] },
      { name: "Trim", minutes: 45, asks: [] },
    ],
  },
  {
    id: "esthetics",
    label: "Esthetician",
    asks: [
      text("skin_goals", "Their main skin goals"),
      text("products", "Products they use now"),
      text("recent_treatments", "Recent treatments (peels, retinol, Botox)"),
      text("sensitivities", "Known allergies or sensitivities"),
      photo("skin_photo", "A clear photo of their skin, no makeup"),
    ],
    services: [
      { name: "Signature facial", minutes: 60, asks: ["skin_goals", "products", "sensitivities"] },
      { name: "Brow lamination", minutes: 45, asks: ["sensitivities"] },
      { name: "Dermaplaning", minutes: 45, asks: ["recent_treatments", "sensitivities"] },
    ],
  },
  {
    id: "tattoo",
    label: "Tattoo artist",
    asks: [
      photo("reference_art", "Reference art or ideas"),
      photo("placement_photo", "A photo of the placement area"),
      text("size", "Size in inches"),
      text("color", "Color or black and grey"),
      text("first_tattoo", "Whether it's their first tattoo"),
    ],
    services: [
      { name: "Small flash piece", minutes: 90, asks: ["placement_photo", "size"] },
      { name: "Custom piece (half day)", minutes: 240, asks: ["reference_art", "placement_photo", "size", "color"] },
      { name: "Touch-up", minutes: 60, asks: ["placement_photo"] },
    ],
  },
  {
    id: "nails",
    label: "Nail tech",
    asks: [
      photo("inspo_photo", "An inspo photo"),
      photo("current_nails", "A photo of their current nails"),
      text("length_shape", "Length and shape"),
      text("removal", "Whether they need a removal"),
    ],
    services: [
      { name: "Gel full set", minutes: 90, asks: ["inspo_photo", "length_shape", "removal"] },
      { name: "Fill", minutes: 60, asks: ["current_nails"] },
      { name: "Gel pedicure", minutes: 60, asks: [] },
    ],
  },
  {
    id: "lashes",
    label: "Lash artist",
    asks: [
      photo("inspo_photo", "An inspo photo"),
      text("last_fill", "Date of their last fill"),
      text("sensitivities", "Known sensitivities to adhesive"),
      text("other_artist", "Whether another artist did their current set"),
    ],
    services: [
      { name: "Classic full set", minutes: 120, asks: ["inspo_photo", "sensitivities"] },
      { name: "Hybrid full set", minutes: 150, asks: ["inspo_photo", "sensitivities"] },
      { name: "Lash fill", minutes: 60, asks: ["last_fill", "other_artist"] },
    ],
  },
  {
    id: "barber",
    label: "Barber",
    asks: [photo("reference_photo", "A reference photo"), text("guard", "Guard or length preference")],
    services: [
      { name: "Haircut", minutes: 45, asks: ["reference_photo"] },
      { name: "Cut + beard", minutes: 60, asks: ["reference_photo"] },
      { name: "Line-up", minutes: 20, asks: [] },
    ],
  },
  {
    id: "other",
    label: "Something else",
    asks: [photo("reference_photo", "A reference photo"), text("details", "Details about what they want")],
    services: [{ name: "", minutes: 60, asks: [] }],
  },
];

export function servicesFor(typeId: string): ServiceDraft[] {
  const t = BUSINESS_TYPES.find((x) => x.id === typeId) ?? BUSINESS_TYPES[0];
  return t.services.map((s) => ({
    name: s.name,
    price: "",
    minutes: s.minutes,
    deposit: "",
    intake: t.asks.filter((a) => s.asks.includes(a.key)),
  }));
}

export const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 210, 240, 300, 360, 420, 480];
export const durationLabel = (m: number) =>
  m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m / 60} hr`;
