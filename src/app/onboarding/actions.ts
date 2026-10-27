"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { serviceRoleClient } from "@/lib/repo/supabase";
import { TextingRegistrationInput } from "@/lib/validation";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const money = z.string().trim().regex(/^\d{0,5}(\.\d{1,2})?$/, "Prices should be numbers like 95 or 95.50");

const Input = z.object({
  businessType: z.string().min(1).max(30),
  businessName: z.string().trim().min(1, "Add your business name").max(80),
  ownerName: z.string().trim().min(1, "Add your first name").max(40),
  timezone: z.string().min(1).max(60),
  services: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Every service needs a name").max(80),
        price: money,
        minutes: z.number().int().min(5).max(720),
        deposit: money,
        intake: z.array(z.object({ key: z.string().max(40), label: z.string().max(120), type: z.enum(["photo", "text"]) })).max(10),
      }),
    )
    .min(1, "Add at least one service")
    .max(40),
  // partialRecord: closed days are simply left out (z.record with an enum key would require all 7)
  hours: z.partialRecord(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]), z.array(z.object({ start: time, end: time })).max(3)),
  minNoticeHours: z.number().int().min(0).max(168),
  bufferMinutes: z.number().int().min(0).max(120),
  policies: z.string().max(2000),
  autonomy: z.enum(["auto", "approve_all", "situational"]),
  texting: TextingRegistrationInput.nullable(),
});

export type OnboardingInput = z.input<typeof Input>;

const cents = (v: string) => (v.trim() === "" ? null : Math.round(Number(v) * 100));

export async function createBusiness(raw: OnboardingInput): Promise<{ error: string } | undefined> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Something's missing." };
  const d = parsed.data;
  if (!Object.values(d.hours).some((w) => w.length)) return { error: "Pick at least one day you're open." };
  for (const ws of Object.values(d.hours)) for (const w of ws ?? []) if (w.end <= w.start) return { error: "Closing time has to be after opening time." };
  try {
    Intl.DateTimeFormat("en-US", { timeZone: d.timezone });
  } catch {
    d.timezone = "America/Los_Angeles";
  }

  const sb = serviceRoleClient();
  const existing = await sb.from("businesses").select("id").eq("owner_id", user.id).maybeSingle();
  if (existing.data) redirect("/");

  const { data: biz, error } = await sb
    .from("businesses")
    .insert({
      owner_id: user.id,
      name: d.businessName,
      owner_name: d.ownerName,
      business_type: d.businessType,
      timezone: d.timezone,
      autonomy: d.autonomy,
      hours: d.hours,
      buffer_minutes: d.bufferMinutes,
      min_notice_hours: d.minNoticeHours,
      policies: d.policies.trim(),
      plan: d.texting ? "pro" : "trial",
      monthly_text_limit: d.texting ? 1000 : 0,
      ...(d.texting
        ? { texting_status: "requested", texting_registration: { ...d.texting, ein: d.texting.ein || null }, texting_requested_at: new Date().toISOString() }
        : {}),
    })
    .select("id")
    .single();
  if (error || !biz) return { error: `Couldn't save your business: ${error?.message}` };

  const svc = await sb.from("services").insert(
    d.services.map((s, i) => ({
      business_id: biz.id,
      name: s.name,
      price_cents: cents(s.price),
      duration_minutes: s.minutes,
      deposit_cents: cents(s.deposit) ?? 0,
      intake: s.intake,
      sort: i,
    })),
  );
  if (svc.error) return { error: `Couldn't save your services: ${svc.error.message}` };

  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  const mm = String(m).padStart(2, "0");
  await sb.from("goals").insert({
    business_id: biz.id, label: "Book 20 appointments with Bemby this month", metric: "ai_bookings", target: 20,
    period_start: `${y}-${mm}-01`, period_end: `${y}-${mm}-${new Date(Date.UTC(y, m, 0)).getUTCDate()}`, reward_xp: 200,
  });
  redirect("/?welcome=1");
}
