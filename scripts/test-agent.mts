/**
 * Offline check of the booking flow: a scripted stand-in for Claude walks through
 * check_availability -> request_appointment, and we verify the repo + approval logic.
 * Run: npx tsx scripts/test-agent.mts
 */
import assert from "node:assert/strict";
import type Anthropic from "@anthropic-ai/sdk";
import { MemoryRepo } from "../src/lib/repo/memory";
import { seedDemo, DEMO_BUSINESS_ID } from "../src/lib/repo/seed";
import { runBemby } from "../src/lib/ai/agent";
import { findOpenSlots } from "../src/lib/scheduling";
import { zonedParts } from "../src/lib/time";

const now = new Date("2026-10-27T17:00:00Z"); // Tue 10:00 AM in Los Angeles
const repo = new MemoryRepo(seedDemo(now));
const biz = (await repo.getBusiness(DEMO_BUSINESS_ID))!;
const services = await repo.listServices(biz.id);
const silk = services.find((s) => s.name === "Silk press")!;

// 1. Scheduling respects hours, notice and existing bookings
const appts = await repo.listAppointments(biz.id, now.toISOString(), new Date(now.getTime() + 15 * 86400_000).toISOString());
const slots = findOpenSlots({ business: biz, service: silk, appointments: appts, now, limit: 40 });
assert.ok(slots.length > 0, "should find slots");
for (const s of slots) {
  const p = zonedParts(s.start, biz.timezone);
  assert.notEqual(p.dayKey, "sun", "no Sunday slots");
  assert.ok(s.start.getTime() >= now.getTime() + 12 * 3600_000, "min notice");
  const endP = zonedParts(s.end, biz.timezone);
  assert.ok(endP.hour * 60 + endP.minute <= (p.dayKey === "sat" ? 16 * 60 : 18 * 60), "ends within hours");
  for (const a of appts.filter((x) => x.status !== "declined" && x.status !== "cancelled")) {
    assert.ok(!(s.start < new Date(a.ends_at) && s.end > new Date(a.starts_at)), "no overlap");
  }
}
console.log(`ok scheduling: ${slots.length} slots, first ${slots[0].start.toISOString()}`);

// 2. Agent flow with a scripted model
const client = await repo.findOrCreateClient(biz.id, "sms", "+15555550199");
const convo = await repo.findOrCreateConversation(biz.id, client.id, "sms");
await repo.addMessage({ business_id: biz.id, conversation_id: convo.id, author: "client", body: "hi! can i get a silk press thursday afternoon? im Bri", media: [], status: "received", approval_reason: null });

let call = 0;
let offered = "";
const fake = {
  messages: {
    async create(params: Anthropic.MessageCreateParamsNonStreaming) {
      call++;
      const last = params.messages[params.messages.length - 1];
      if (call === 1) {
        assert.match(String((params.system as Anthropic.TextBlockParam[])[0].text), /Silk press/);
        return { stop_reason: "tool_use", content: [
          { type: "tool_use", id: "t1", name: "save_client_name", input: { name: "Bri" } },
          { type: "tool_use", id: "t2", name: "check_availability", input: { service_id: silk.id, from_date: "2026-10-29", days: 1, time_of_day: "afternoon" } },
        ] };
      }
      if (call === 2) {
        const results = (last.content as Anthropic.ToolResultBlockParam[]).map((r) => String(r.content));
        offered = results[1].split("\n")[0].split(" = ")[0];
        assert.ok(offered.startsWith("2026-10-29"), `expected Thursday slot, got ${results[1]}`);
        return { stop_reason: "tool_use", content: [
          { type: "tool_use", id: "t3", name: "request_appointment", input: { service_id: silk.id, start_iso: offered, notes: "Silk press, Thursday afternoon. New client.", intake_answers: {} } },
        ] };
      }
      const result = String((last.content as Anthropic.ToolResultBlockParam[])[0].content);
      assert.match(result, /Request sent/);
      return { stop_reason: "end_turn", content: [{ type: "text", text: "You're all set to request Thu at 2:00 PM! Kiara will confirm shortly." }] };
    },
  },
} as unknown as Anthropic;

const res = await runBemby({ repo, conversationId: convo.id, now, anthropic: fake });
assert.ok(res.appointment, "appointment created");
assert.equal(res.appointment!.status, "requested");
assert.equal(res.appointment!.starts_at, new Date(offered).toISOString());
assert.equal((await repo.getClient(client.id))!.name, "Bri");
assert.equal(res.needsApproval, false, "new_client rule is off in demo, so it sends");
assert.equal(res.message!.status, "sent");
console.log("ok agent booking:", res.message!.body);

// 3. Approval rules: turn on 'every booking' and the next reply waits for the owner
await repo.updateBusiness(biz.id, { ask_first: { ...biz.ask_first, every_booking: true } });
await repo.addMessage({ business_id: biz.id, conversation_id: convo.id, author: "client", body: "also can my friend come same day 4pm?", media: [], status: "received", approval_reason: null });
call = 0;
const fake2 = { messages: { async create() {
  call++;
  if (call === 1) return { stop_reason: "tool_use", content: [{ type: "tool_use", id: "x", name: "request_appointment", input: { service_id: silk.id, start_iso: offered, notes: "dup" } }] };
  return { stop_reason: "end_turn", content: [{ type: "text", text: "That time just got taken, want another?" }] };
} } } as unknown as Anthropic;
const res2 = await runBemby({ repo, conversationId: convo.id, now, anthropic: fake2 });
assert.equal(res2.appointment, null, "double booking is refused");
assert.equal(res2.message!.status, "sent");
console.log("ok double-booking refused");

// 4. Owner took over -> Bemby stays quiet
await repo.updateConversation(convo.id, { mode: "owner" });
await repo.addMessage({ business_id: biz.id, conversation_id: convo.id, author: "client", body: "hello?", media: [], status: "received", approval_reason: null });
const res3 = await runBemby({ repo, conversationId: convo.id, now, anthropic: fake2 });
assert.equal(res3.message, null);
console.log("ok paused while owner is in the chat");
console.log("\nAll checks passed.");
