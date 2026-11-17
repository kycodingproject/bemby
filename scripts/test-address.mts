/* eslint-disable @typescript-eslint/no-explicit-any -- test fixtures */
import { MemoryRepo } from "../src/lib/repo/memory";
import { seedDemo } from "../src/lib/repo/seed";
import { addressForClient, mapsLink } from "../src/lib/address";
import { buildSystemPrompt } from "../src/lib/ai/prompt";
import { bookingsIcs } from "../src/lib/calendar/feed";
const ok = (n: string, c: boolean) => console.log(c ? "ok  " : "BAD ", n);
const repo = new MemoryRepo(seedDemo(new Date()));
const b = repo.db.businesses[0];
const msg = addressForClient(b);
console.log("confirmation adds:" + msg.replace(/\n/g, "\n   "));
ok("address + directions + map link", msg.includes("1420 Sunset Blvd") && msg.includes("Free parking") && msg.includes(mapsLink(b.address!)));
ok("no address set -> nothing added", addressForClient({ ...b, address: null }) === "");
const base = { services: repo.db.services, specials: [], client: repo.db.clients[0], conversation: repo.db.conversations[0], pastVisits: 0, upcoming: [], now: new Date() } as any;
ok("public: AI may share it", buildSystemPrompt({ ...base, business: b }).includes("Address: 1420 Sunset Blvd") );
const priv = buildSystemPrompt({ ...base, business: { ...b, address_public: false } });
ok("private: AI won't share it before booking", !priv.includes("1420 Sunset") && priv.includes("sent once their appointment is confirmed"));
const appt: any = { id: "a", client_id: repo.db.clients[0].id, service_id: repo.db.services[0].id, starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 3600e3).toISOString(), status: "confirmed", notes: "", intake: {}, photos: [] };
ok("calendar feed has LOCATION", /LOCATION:1420 Sunset Blvd\\, Suite 4\\, Los Angeles/.test(bookingsIcs(b, [appt], repo.db.services, repo.db.clients).replace(/\r\n /g, "")));
