import { currentBusinessId, getRepo } from "@/lib/repo";
import { SpecialBuilder } from "@/components/SpecialBuilder";

export default async function SpecialsPage() {
  const repo = getRepo();
  const businessId = await currentBusinessId();
  const services = await repo.listServices(businessId);
  const specials = await repo.listSpecials(businessId);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Specials</h1>
        <p className="mt-1.5 text-sm text-muted">Tell Bemby the deal. It writes the post, and mentions it to clients who message you.</p>
      </header>
      <SpecialBuilder services={services.map((s) => ({ id: s.id, name: s.name }))} today={today} />
      {specials.length > 0 && (
        <section className="card p-6" aria-label="Your specials">
          <h2 className="mb-3 font-display text-xl font-semibold">Your specials</h2>
          <ul className="flex flex-col gap-2.5">
            {specials.map((s) => {
              const active = s.starts_on <= today && s.ends_on >= today;
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-soft px-4 py-3 text-sm">
                  <span className="font-semibold">{s.deal} {services.find((x) => x.id === s.service_id)?.name.toLowerCase() ?? ""}</span>
                  <span className="text-muted">{s.starts_on} to {s.ends_on}{s.mention_in_chats ? " · Bemby mentions it" : ""}</span>
                  <span className={active ? "text-ok" : "text-muted"}>{active ? "Running now" : s.ends_on < today ? "Ended" : "Scheduled"}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
