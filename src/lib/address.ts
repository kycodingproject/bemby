import type { Business } from "./types";

/** A Google Maps link that opens in Apple Maps / Google Maps on phones. */
export const mapsLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/** The lines added to a confirmed-booking message, or "" if no address is set. */
export function addressForClient(b: Business) {
  const a = b.address?.trim();
  if (!a) return "";
  return `\n\n📍 ${a}${b.address_note?.trim() ? `\n${b.address_note.trim()}` : ""}\n${mapsLink(a)}`;
}
