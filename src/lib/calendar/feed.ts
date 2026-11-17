import type { Appointment, Business, Client, Service } from "../types";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
const stamp = (d: Date | string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

/** Calendar apps want lines of 75 bytes or less; longer ones continue on the next line after a space. */
function fold(line: string) {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

/** Bemby's bookings as a calendar that Google Calendar, Apple Calendar and Outlook can subscribe to. */
export function bookingsIcs(business: Business, appointments: Appointment[], services: Service[], clients: Client[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bemby//Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`${business.name} bookings`)}`,
    `X-WR-TIMEZONE:${business.timezone}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
  ];
  const now = stamp(new Date());
  for (const a of appointments) {
    if (a.status !== "confirmed" && a.status !== "requested") continue;
    const service = services.find((s) => s.id === a.service_id)?.name ?? "Appointment";
    const client = clients.find((c) => c.id === a.client_id)?.name ?? "Client";
    const pending = a.status === "requested";
    const details = [
      pending ? "Waiting for your OK in Bemby." : "",
      a.price_cents != null ? `Price: $${a.price_cents / 100}` : "",
      a.notes,
      ...Object.entries(a.intake ?? {}).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`),
      a.photos?.length ? `${a.photos.length} photo${a.photos.length === 1 ? "" : "s"} in Bemby` : "",
    ].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${a.id}@bemby`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(a.starts_at)}`,
      `DTEND:${stamp(a.ends_at)}`,
      `SUMMARY:${esc(`${pending ? "Pending: " : ""}${service} · ${client}`)}`,
      ...(details ? [`DESCRIPTION:${esc(details)}`] : []),
      ...(business.address?.trim() ? [`LOCATION:${esc(business.address.trim())}`] : []),
      `STATUS:${pending ? "TENTATIVE" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
