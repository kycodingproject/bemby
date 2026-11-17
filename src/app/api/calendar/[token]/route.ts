import { NextResponse, type NextRequest } from "next/server";
import { getRepo } from "@/lib/repo";
import { bookingsIcs } from "@/lib/calendar/feed";

export const dynamic = "force-dynamic";

/**
 * The private calendar link an owner subscribes to in Google/Apple Calendar.
 * Calendar apps can't sign in, so the long random token in the address is the key (the owner can reset it).
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const token = (await ctx.params).token.replace(/\.ics$/i, "");
  if (!/^[a-f0-9]{48}$/.test(token)) return new NextResponse("Not found", { status: 404 });
  const repo = getRepo();
  const business = await repo.getBusinessByCalendarToken(token);
  if (!business) return new NextResponse("Not found", { status: 404 });
  const from = new Date(Date.now() - 60 * 86400_000).toISOString();
  const to = new Date(Date.now() + 365 * 86400_000).toISOString();
  const [appointments, services, clients] = await Promise.all([repo.listAppointments(business.id, from, to), repo.listServices(business.id), repo.listClients(business.id)]);
  return new NextResponse(bookingsIcs(business, appointments, services, clients), {
    headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'inline; filename="bemby.ics"', "cache-control": "no-store" },
  });
}
