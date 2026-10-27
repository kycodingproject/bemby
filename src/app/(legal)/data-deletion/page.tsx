import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Data Deletion · Bemby" };

export default async function DataDeletionPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const { appName: app, contactEmail: email } = LEGAL;
  const safeCode = code && /^[a-z0-9-]{6,64}$/i.test(code) ? code : null;
  return (
    <>
      <h1>Data Deletion</h1>
      {safeCode && (
        <p className="rounded-2xl bg-ok-soft px-4 py-3 text-ok">
          We received your deletion request (confirmation code <strong>{safeCode}</strong>). Connection data from Instagram or Facebook is removed right away, and any remaining data is deleted within 30 days.
        </p>
      )}

      <h2>Business owners</h2>
      <p>You can delete your data yourself at any time:</p>
      <ul>
        <li>
          <strong>Disconnect Instagram or Messenger:</strong> in {app}, go to Settings → Where clients reach you → Disconnect. We immediately delete the access tokens for that account. You can also remove {app} in Instagram (Settings → Website permissions → Apps and websites) or Facebook (Settings → Business integrations).
        </li>
        <li>
          <strong>Delete your whole account:</strong> in {app}, go to Settings → Delete account. This cancels your subscription and permanently deletes your business, services, conversations, appointments, photos and connected accounts. Remaining backups are removed within 30 days.
        </li>
        <li>Or email <strong>{email}</strong> from your account email and we&apos;ll do it for you within 30 days.</li>
      </ul>

      <h2>Clients of a business</h2>
      <p>
        If you messaged a business that uses {app} and want your messages, photos or booking details deleted, contact that business, or email <strong>{email}</strong> with the business name and the phone number or Instagram/Facebook name you used. We&apos;ll confirm your request and delete the data within 30 days. To stop text messages, reply <strong>STOP</strong>.
      </p>

      <h2>Removing {app} from Instagram or Facebook</h2>
      <p>
        When you remove {app} from your Instagram or Facebook settings, Meta notifies us automatically and we delete the connection data for that account. You&apos;ll get a confirmation code you can check on this page.
      </p>
    </>
  );
}
