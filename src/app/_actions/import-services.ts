"use server";

import { authEnabled, currentUser } from "@/lib/auth";
import { extractServices, type PriceListFile } from "@/lib/ai/import-services";
import type { ServiceDraft } from "@/lib/templates";

const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

/** Used by onboarding and Settings: speak your services or upload a price list, get rows back to review. */
export async function importServices(input: { businessType: string; text?: string; file?: PriceListFile }): Promise<{ services: ServiceDraft[] } | { error: string }> {
  if (authEnabled() && !(await currentUser())) return { error: "Please sign in again." };
  if (!process.env.ANTHROPIC_API_KEY) return { error: "The AI key isn't set up yet (ANTHROPIC_API_KEY)." };
  const text = input.text?.trim().slice(0, 8000);
  const file = input.file && TYPES.has(input.file.mediaType) && typeof input.file.data === "string" ? input.file : undefined;
  if (input.file && !file) return { error: "Use a photo (JPG or PNG) or a PDF." };
  if (file && file.data.length > 4_200_000) return { error: "That file is too big. Try a photo or a PDF under 3 MB." };
  if (!file && (!text || text.length < 3)) return { error: "Say or type your services first." };
  try {
    const services = await extractServices({ businessType: String(input.businessType).slice(0, 30), text, file });
    if (!services.length) return { error: file ? "Couldn't find any services in that file. Try a clearer photo." : "Couldn't pick out any services. Try saying the name and price of each one." };
    return { services };
  } catch (e) {
    console.error("importServices failed", e);
    const err = e as { status?: number; message?: string; name?: string };
    const why =
      err.status === 401 ? "The AI key (ANTHROPIC_API_KEY) isn't valid." :
      err.status === 404 ? "The AI model name isn't right (check BEMBY_VISION_MODEL / BEMBY_CHAT_MODEL)." :
      err.status === 413 ? "That file is too big. Try a screenshot or a smaller photo." :
      err.status === 429 || err.status === 529 ? "The AI is busy right now. Try again in a minute." :
      /timeout|timed out/i.test(`${err.name} ${err.message}`) ? "Reading that took too long. Try a clearer or smaller photo." :
      `Something went wrong reading that (${err.status ?? ""} ${String(err.message ?? "").slice(0, 120)}). Try again.`;
    return { error: why };
  }
}
