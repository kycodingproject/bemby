import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { seedDemo, DEMO_BUSINESS_ID } from "./seed";

const DEMO_OWNER_EMAIL = "sample-studio@bemby.app";
let ready: Promise<void> | null = null;

async function demoOwnerId(sb: SupabaseClient) {
  const created = await sb.auth.admin.createUser({ email: DEMO_OWNER_EMAIL, email_confirm: true });
  if (created.data.user) return created.data.user.id;
  // Already exists: find it
  for (let page = 1; page < 20; page++) {
    const { data } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    const u = data.users.find((x) => x.email === DEMO_OWNER_EMAIL);
    if (u) return u.id;
    if (data.users.length < 200) break;
  }
  throw new Error(`Could not create the sample studio owner: ${created.error?.message}`);
}

async function seed(sb: SupabaseClient) {
  const db = seedDemo(new Date());
  const ownerId = await demoOwnerId(sb);
  const ins = async (table: string, rows: object[]) => {
    if (!rows.length) return;
    const { error } = await sb.from(table).insert(rows);
    if (error) throw new Error(`seeding ${table}: ${error.message}`);
  };
  const { error } = await sb.from("businesses").insert(db.businesses.map((b) => ({ ...b, owner_id: ownerId })));
  if (error) {
    if (error.code === "23505") return; // another request is seeding right now
    throw new Error(`seeding businesses: ${error.message}`);
  }
  await ins("services", db.services);
  await ins("clients", db.clients);
  await ins("conversations", db.conversations);
  await ins("messages", db.messages);
  // Original appointments first, so reschedule requests can point at them.
  await ins("appointments", db.appointments.filter((a) => !a.replaces_appointment_id));
  await ins("appointments", db.appointments.filter((a) => a.replaces_appointment_id));
  await ins("goals", db.goals);
}

/** Make sure the sample studio exists in Supabase (created once, kept between visits). */
export function ensureSupabaseDemo(sb: SupabaseClient) {
  if (!ready) {
    ready = (async () => {
      const { data, error } = await sb.from("businesses").select("id").eq("id", DEMO_BUSINESS_ID).maybeSingle();
      if (error) throw new Error(`Supabase: ${error.message}. (If this mentions a missing table, run supabase/migrations/0001_init.sql in the SQL Editor.)`);
      if (!data) await seed(sb);
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

/** Wipe and recreate the sample studio. */
export async function resetSupabaseDemo(sb: SupabaseClient) {
  await sb.from("businesses").delete().eq("id", DEMO_BUSINESS_ID);
  ready = null;
  await ensureSupabaseDemo(sb);
}
