import type { Repo } from "../repo/types";
import type { Business } from "../types";
import { externalBusy } from "./external";

/**
 * Everything Bemby must not book over: time the owner blocked in Bemby, plus events on their linked calendars.
 * (Existing appointments are handled separately by the scheduler.)
 */
export async function busyTimes(repo: Repo, business: Business, from: Date, to: Date) {
  const [own, ext] = await Promise.all([
    repo.listBlocks(business.id, from.toISOString(), to.toISOString()).catch(() => []),
    externalBusy(business, from, to),
  ]);
  return [...own.map((b) => ({ start: new Date(b.starts_at).getTime(), end: new Date(b.ends_at).getTime() })), ...ext.blocks];
}
