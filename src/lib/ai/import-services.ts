import Anthropic from "@anthropic-ai/sdk";
import { BUSINESS_TYPES, DURATIONS, type ServiceDraft } from "../templates";

const MODEL = process.env.BEMBY_VISION_MODEL ?? "claude-sonnet-5-5";

export type PriceListFile = { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf" };

const snap = (m: number) => DURATIONS.reduce((best, d) => (Math.abs(d - m) < Math.abs(best - m) ? d : best), DURATIONS[0]);
const money = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? String(Math.round(n * 100) / 100) : "");

/** Turn a spoken description or a photo/PDF of a price list into service rows the owner can review. */
export async function extractServices(input: { businessType: string; text?: string; file?: PriceListFile }): Promise<ServiceDraft[]> {
  const type = BUSINESS_TYPES.find((t) => t.id === input.businessType) ?? BUSINESS_TYPES[BUSINESS_TYPES.length - 1];
  const askKeys = type.asks.map((a) => a.key);

  const tool: Anthropic.Tool = {
    name: "save_services",
    description: "Save every service found, in the order they appear.",
    input_schema: {
      type: "object",
      properties: {
        services: {
          type: "array",
          maxItems: 40,
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Short service name as the business would say it, e.g. 'Knotless braids (medium)'" },
              price: { type: ["number", "null"], description: "Price in dollars. For 'from $X' or a range, use the lowest. null if not given." },
              minutes: { type: ["integer", "null"], description: "How long it takes in minutes. If not given, estimate a typical time for this kind of service." },
              deposit: { type: ["number", "null"], description: "Deposit in dollars if mentioned, otherwise null." },
              asks: {
                type: "array",
                items: { type: "string", enum: askKeys.length ? askKeys : ["none"] },
                description: "What the receptionist should collect before booking this service, picked from the allowed list. Usually photos for anything visual.",
              },
            },
            required: ["name", "price", "minutes", "deposit", "asks"],
          },
        },
      },
      required: ["services"],
    },
  };

  const content: Anthropic.ContentBlockParam[] = [];
  if (input.file) {
    content.push(
      input.file.mediaType === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: input.file.data } }
        : { type: "image", source: { type: "base64", media_type: input.file.mediaType, data: input.file.data } },
    );
  }
  content.push({
    type: "text",
    text:
      `This is a ${type.label.toLowerCase()} business setting up its service menu. ` +
      (input.file
        ? "Read the attached price list and list every service with its price."
        : `The owner described their services out loud (speech-to-text, so expect typos and filler words):\n"""\n${input.text}\n"""`) +
      "\nRules: one row per bookable service. If one service has different prices by size or length, make a row for each. Include add-ons as their own rows. " +
      "Don't invent services or prices that weren't given. Skip headings, policies and contact info." +
      (askKeys.length ? ` Allowed 'asks': ${type.asks.map((a) => `${a.key} (${a.label})`).join("; ")}.` : ""),
  });

  const res = await new Anthropic().messages.create({
    model: MODEL,
    max_tokens: 4000,
    tools: [tool],
    tool_choice: { type: "tool", name: "save_services" },
    messages: [{ role: "user", content }],
  });
  const call = res.content.find((b) => b.type === "tool_use");
  const raw = (call?.type === "tool_use" ? (call.input as { services?: unknown[] }).services : null) ?? [];

  return raw
    .map((x) => x as { name?: unknown; price?: unknown; minutes?: unknown; deposit?: unknown; asks?: unknown })
    .filter((x) => typeof x.name === "string" && x.name.trim())
    .slice(0, 40)
    .map((x) => ({
      name: String(x.name).trim().slice(0, 80),
      price: money(x.price),
      minutes: snap(typeof x.minutes === "number" && x.minutes > 0 ? x.minutes : 60),
      deposit: money(x.deposit),
      intake: type.asks.filter((a) => Array.isArray(x.asks) && x.asks.includes(a.key)),
    }));
}
