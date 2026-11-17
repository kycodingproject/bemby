"use client";

import { useState, useTransition } from "react";
import { addCalendarFeed, newCalendarLink, removeCalendarFeed, setAllDayBlocks } from "@/app/(app)/actions";

export interface FeedStatus {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

/** Settings: link Google/Apple calendars so Bemby never double-books, and show Bemby bookings in those calendars. */
export function CalendarSync(props: { demo: boolean; feeds: FeedStatus[]; allDayBlocks: boolean; bookingsLink: string | null }) {
  const [busy, start] = useTransition();
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const add = () =>
    start(async () => {
      setMsg(null);
      const r = await addCalendarFeed(url);
      if (r && "error" in r && r.error) setMsg({ ok: false, text: r.error });
      else {
        setMsg({ ok: true, text: (r && "message" in r && r.message) || "Calendar linked." });
        setUrl("");
      }
    });

  const copy = async () => {
    if (!props.bookingsLink) return;
    try {
      await navigator.clipboard.writeText(props.bookingsLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg({ ok: false, text: "Couldn't copy. Press and hold the link to copy it." });
    }
  };

  const help = "rounded-xl bg-card px-3.5 py-3 text-[13px] leading-relaxed text-ink-2 shadow-[inset_0_0_0_1px_rgba(26,24,48,0.08)]";
  const sum = "cursor-pointer text-[13px] font-semibold text-brand-ink";

  return (
    <section id="calendar-sync" aria-labelledby="calsync-h" className="card flex flex-col gap-6 p-6">
      <div>
        <h2 id="calsync-h" className="font-display text-xl font-semibold">Calendar sync</h2>
        <p className="mt-1 text-sm text-muted">Works with Google Calendar, Apple Calendar and Outlook.</p>
      </div>

      {/* Their calendar -> Bemby */}
      <div className="flex flex-col gap-3 rounded-2xl bg-soft p-4">
        <div>
          <p className="text-sm font-semibold">1. Stop double-booking</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
            Link your personal or work calendar. Bemby treats everything on it as busy and never offers those times to clients. Clients never see what your events are.
          </p>
        </div>

        {props.feeds.length > 0 && (
          <ul className="flex flex-col gap-2">
            {props.feeds.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card px-3.5 py-2.5 shadow-[inset_0_0_0_1px_rgba(26,24,48,0.08)]">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{f.label}</p>
                  <p className={`text-[13px] ${f.ok ? "text-ok" : "text-danger"}`}>{f.ok ? `Linked · ${f.detail}` : f.detail}</p>
                </div>
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => start(() => removeCalendarFeed(f.id))}>Remove</button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label className="flex min-w-60 flex-1 flex-col gap-1.5 text-[13px] text-muted">
            Paste your calendar link
            <input className="input bg-card" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://calendar.google.com/calendar/ical/… or webcal://…icloud.com/…" disabled={props.demo} />
          </label>
          <button className="btn btn-primary" disabled={busy || props.demo || !url.trim()}>{busy ? "Checking…" : "Link calendar"}</button>
        </form>
        {props.demo && <p className="text-[13px] text-muted">Available on your own account.</p>}
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}

        <details className={help}>
          <summary className={sum}>Where do I find my Google Calendar link?</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>On a computer, open <strong>calendar.google.com</strong>.</li>
            <li>On the left, hover over your calendar, click the <strong>three dots</strong>, then <strong>Settings and sharing</strong>.</li>
            <li>Scroll down to <strong>Integrate calendar</strong>.</li>
            <li>Copy the <strong>Secret address in iCal format</strong> (it ends in <code>.ics</code>) and paste it above.</li>
          </ol>
          <p className="mt-2 text-muted">Use the secret address, not the public one. Keep it private: anyone with it can see your calendar.</p>
        </details>
        <details className={help}>
          <summary className={sum}>Where do I find my Apple Calendar link?</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>On your iPhone, open the <strong>Calendar</strong> app and tap <strong>Calendars</strong> at the bottom.</li>
            <li>Tap the <strong>ⓘ</strong> next to the calendar you use for your schedule.</li>
            <li>Turn on <strong>Public Calendar</strong>, then tap <strong>Share Link</strong> and copy it.</li>
            <li>Paste it above (it starts with <code>webcal://</code>).</li>
          </ol>
          <p className="mt-2 text-muted">On a Mac: Calendar app → right-click the calendar → Share Calendar → Public Calendar. Anyone with the link can view that calendar, so only share it here.</p>
        </details>

        <details className={help}>
          <summary className={sum}>Use Vagaro? Block your Vagaro appointments too</summary>
          <p className="mt-2 font-semibold">Step 1: Sync Vagaro to your Google Calendar</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Log in to <strong>vagaro.com</strong> on a computer (as the owner or a manager).</li>
            <li>Go to <strong>Settings</strong> → <strong>Employees</strong> → <strong>Employee Profiles</strong>.</li>
            <li>Find your own profile, open its <strong>action menu</strong> (the dots), and choose <strong>Integrations</strong>.</li>
            <li>Choose <strong>Sync Google Calendar</strong> and sign in with the same Google account you use for your calendar. Allow the permissions it asks for.</li>
            <li>Make sure <strong>Vagaro events</strong> is turned on, so your Vagaro appointments are copied to Google.</li>
            <li>Click <strong>Connect Calendar</strong>. Within a few minutes your Vagaro appointments show up in Google Calendar.</li>
          </ol>
          <p className="mt-3 font-semibold">Step 2: Link that Google Calendar here</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Follow &ldquo;Where do I find my Google Calendar link?&rdquo; above for the calendar your Vagaro appointments appear in.</li>
            <li>Paste its secret address in the box above and tap <strong>Link calendar</strong>.</li>
          </ol>
          <p className="mt-2 text-muted">
            Now anything booked in Vagaro also blocks that time in Bemby, so clients can&apos;t be double-booked across the two. If a stylist on your team takes the bookings, they&apos;d sync their own Vagaro profile the same way. Vagaro sometimes renames its menus; if a step looks different, search &ldquo;Google Calendar&rdquo; in Vagaro&apos;s help center.
          </p>
        </details>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" className="mt-1 size-4 accent-[var(--color-brand)]" checked={props.allDayBlocks} disabled={busy || props.demo} onChange={(e) => start(() => setAllDayBlocks(e.target.checked))} />
          <span>
            All-day events block the whole day
            <span className="block text-[13px] text-muted">Like a vacation or a day off. Events you&apos;ve marked &ldquo;Free&rdquo; in Google never block.</span>
          </span>
        </label>
      </div>

      {/* Bemby -> their calendar */}
      <div className="flex flex-col gap-3 rounded-2xl bg-soft p-4">
        <div>
          <p className="text-sm font-semibold">2. See Bemby bookings in your calendar</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
            Subscribe to your private Bemby link and every booking shows up in Google or Apple Calendar, with the client, service and notes. Requests waiting for your OK show as &ldquo;Pending&rdquo;.
          </p>
        </div>
        {props.bookingsLink ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-xl bg-card px-3.5 py-3 text-[13px] shadow-[inset_0_0_0_1px_rgba(26,24,48,0.08)]">{props.bookingsLink}</code>
              <button type="button" className="btn btn-primary" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
            </div>
            <details className={help}>
              <summary className={sum}>Add it to Google Calendar</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>On a computer, open <strong>calendar.google.com</strong>.</li>
                <li>Next to <strong>Other calendars</strong>, click <strong>+</strong>, then <strong>From URL</strong>.</li>
                <li>Paste your Bemby link and click <strong>Add calendar</strong>.</li>
              </ol>
              <p className="mt-2 text-muted">Google checks for new bookings a few times a day, so new ones can take several hours to appear there. They always show right away in Bemby.</p>
            </details>
            <details className={help}>
              <summary className={sum}>Add it to Apple Calendar</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>On your iPhone, open <strong>Calendar</strong> and tap <strong>Calendars</strong> → <strong>Add Calendar</strong> → <strong>Add Subscription Calendar</strong>.</li>
                <li>Paste your Bemby link and tap <strong>Subscribe</strong>, then <strong>Add</strong>.</li>
              </ol>
              <p className="mt-2 text-muted">On a Mac: Calendar → File → New Calendar Subscription. Set &ldquo;Auto-refresh&rdquo; to every 15 minutes.</p>
            </details>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="text-[13px] text-muted underline hover:text-danger"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Make a new link? The old one stops working, so you'll need to subscribe again in your calendar app.")) start(async () => { await newCalendarLink(); });
                }}
              >
                Reset link
              </button>
              <span className="text-[13px] text-muted">Keep this link private. Anyone with it can see your bookings.</span>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-primary self-start"
            disabled={busy || props.demo}
            onClick={() =>
              start(async () => {
                const r = await newCalendarLink();
                if (r && "error" in r && r.error) setMsg({ ok: false, text: r.error });
              })
            }
          >
            Create my calendar link
          </button>
        )}
      </div>
    </section>
  );
}
