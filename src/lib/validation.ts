import { z } from "zod";

export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const money = z.string().trim().regex(/^\d{0,5}(\.\d{1,2})?$/, "Prices should be numbers like 95 or 95.50");
export const cents = (v: string) => (v.trim() === "" ? null : Math.round(Number(v) * 100));
export const dollars = (c: number | null) => (c == null ? "" : String(c % 100 ? (c / 100).toFixed(2) : c / 100));

export const ServiceInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Every service needs a name").max(80),
  price: money,
  minutes: z.number().int().min(5).max(720),
  deposit: money,
  intake: z.array(z.object({ key: z.string().max(40), label: z.string().max(120), type: z.enum(["photo", "text"]) })).max(10),
});

/** Closed days are simply left out. */
export const HoursInput = z.partialRecord(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]), z.array(z.object({ start: time, end: time })).max(3));

export function hoursProblem(hours: z.infer<typeof HoursInput>): string | null {
  const days = Object.values(hours).filter((w) => w && w.length);
  if (!days.length) return "Pick at least one day you're open.";
  for (const ws of days) for (const w of ws ?? []) if (w.end <= w.start) return "Closing time has to be after opening time.";
  return null;
}

/** Carrier registration details for a business phone number (A2P 10DLC). */
export const TextingRegistrationInput = z.object({
  legal_name: z.string().trim().min(2, "Add your legal business name (or your full name if you're a sole proprietor)").max(120),
  ein: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^\d]/g, ""))
    .refine((v) => v === "" || v.length === 9, "An EIN has 9 digits. Leave it blank if you don't have one."),
  street: z.string().trim().min(3, "Add your street address").max(120),
  city: z.string().trim().min(2, "Add your city").max(60),
  state: z.string().trim().regex(/^[A-Za-z]{2}$/, "Use the 2-letter state, like CA").transform((v) => v.toUpperCase()),
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Add a 5-digit ZIP code"),
  contact_phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^\d]/g, "").replace(/^1(?=\d{10}$)/, ""))
    .refine((v) => v.length === 10, "Add a 10-digit US mobile number"),
  contact_email: z.string().trim().email("Add a valid email"),
});
export type TextingRegistrationValues = z.input<typeof TextingRegistrationInput>;
