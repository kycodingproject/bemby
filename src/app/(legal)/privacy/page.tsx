import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Privacy Policy · Bemby" };

export default function PrivacyPage() {
  const { appName: app, operator, contactEmail: email } = LEGAL;
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="muted">Effective {LEGAL.effectiveDate}</p>

      <p>
        {app} is an AI receptionist for service businesses such as hair stylists, estheticians, tattoo artists and nail techs. {app} is operated by {operator} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). This policy explains what we collect, how we use it, and the choices you have. It covers two groups of people:
      </p>
      <ul>
        <li><strong>Business owners</strong> who create a {app} account (&ldquo;you&rdquo;).</li>
        <li><strong>Their clients</strong>, who message a business through text, Instagram or Facebook Messenger and are answered by {app}.</li>
      </ul>
      <p>
        For client conversations, the business is in charge of its client relationships and decides how to use that information. {app} handles client messages on the business&apos;s behalf to answer questions and book appointments.
      </p>

      <h2>Information we collect</h2>
      <h3>From business owners</h3>
      <ul>
        <li>Account details: email address and password (stored securely by our sign-in provider).</li>
        <li>Business details you enter: business name, your first name, services, prices, hours, policies and booking preferences.</li>
        <li>If you request a business phone number: legal business name, EIN (if you have one), business address, mobile number and email, which phone carriers require to register businesses that send text messages.</li>
        <li>Billing details: handled by Stripe. We receive your subscription status and limited details such as card brand and last four digits; we never see or store your full card number.</li>
        <li>Connected accounts: if you connect Instagram or a Facebook Page, we receive access tokens and basic account details (such as your Instagram username or Page name) so {app} can read and reply to your messages.</li>
      </ul>
      <h3>From clients of a business</h3>
      <ul>
        <li>The messages, photos and other content a client sends to the business by text, Instagram or Messenger, and the replies sent back.</li>
        <li>The client&apos;s phone number or Instagram/Messenger account ID, and their name if they share it or it is provided by Instagram or Facebook.</li>
        <li>Appointment details such as the service requested, date and time, and answers to the business&apos;s booking questions (for example, hair length or reference photos).</li>
      </ul>
      <h3>Automatically</h3>
      <ul>
        <li>Basic technical information needed to run the service, such as log records, device and browser type, and cookies that keep business owners signed in. We don&apos;t use advertising cookies.</li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>To answer clients on the business&apos;s behalf, collect booking details, suggest open times and send appointment requests for the business to approve.</li>
        <li>To show business owners their inbox, calendar, goals and specials.</li>
        <li>To register business phone numbers with carriers and send and receive text messages.</li>
        <li>To bill subscriptions, prevent abuse, keep the service secure and fix problems.</li>
        <li>To contact business owners about their account, billing or important changes.</li>
      </ul>
      <p>We do not sell personal information, and we do not use client messages for advertising.</p>

      <h2>AI processing</h2>
      <p>
        {app} uses an AI model provided by Anthropic to read client messages and photos and write replies. Messages are sent to Anthropic only to generate a reply for that conversation. Business owners can review conversations, approve replies before they are sent, or take over a conversation at any time.
      </p>

      <h2>Information from Instagram and Facebook (Meta Platform Data)</h2>
      <p>
        When a business connects Instagram or Messenger, we access messages and basic profile information only to provide {app}&apos;s messaging and booking features to that business. We do not sell Meta Platform Data, use it for advertising, or share it with data brokers. We follow Meta&apos;s Platform Terms. A business can disconnect at any time in {app} Settings or in its Instagram or Facebook settings, and can ask us to delete the data (see <a href="/data-deletion">Data deletion</a>).
      </p>

      <h2>Text messaging (SMS)</h2>
      <ul>
        <li>Clients who text a business&apos;s {app} number receive replies about their inquiry and appointment, such as booking confirmations and reminders. Message frequency varies. Message and data rates may apply.</li>
        <li>Reply <strong>STOP</strong> to stop receiving texts from that business, or <strong>HELP</strong> for help.</li>
        <li>
          <strong>
            No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties.
          </strong>{" "}
          Information may be shared with the service providers listed below only as needed to deliver messages.
        </li>
      </ul>

      <h2>Who we share information with</h2>
      <p>We share information only with service providers that help us run {app}, and only for that purpose:</p>
      <ul>
        <li>Supabase (database, sign-in and photo storage)</li>
        <li>Vercel (website hosting)</li>
        <li>Anthropic (AI replies)</li>
        <li>Twilio (phone numbers and text messaging)</li>
        <li>Meta (Instagram and Messenger messaging)</li>
        <li>Stripe (payments)</li>
      </ul>
      <p>We may also share information if required by law, to protect people&apos;s safety, or as part of a sale or merger of the business, in which case this policy would continue to apply.</p>

      <h2>How long we keep information</h2>
      <p>
        We keep business account data while the account is active. Client conversations and appointments are kept so the business can see its history, until the business deletes them or closes its account. When an account is deleted, we delete its data within 30 days, except where we must keep limited records (for example, billing records) by law.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>Business owners can edit their details in Settings, disconnect Instagram or Messenger, and delete their account in Settings.</li>
        <li>Clients can ask the business they messaged, or contact us, to access or delete their messages and booking details. Texting STOP ends text messages from that business.</li>
        <li>Depending on where you live (for example, California), you may have the right to know, access, correct or delete personal information, and to not be discriminated against for using these rights. Contact us at {email} to make a request.</li>
      </ul>

      <h2>Security</h2>
      <p>
        We use encryption in transit, access controls and separate storage for connection tokens. No system is perfectly secure, but we work to protect your information and will notify affected users of a breach as required by law.
      </p>

      <h2>Children</h2>
      <p>{app} is not intended for children under 13, and business accounts are for adults. We don&apos;t knowingly collect information from children under 13.</p>

      <h2>Changes</h2>
      <p>We may update this policy. If changes are significant, we&apos;ll notify business owners by email or in the app before they take effect.</p>

      <h2>Contact</h2>
      <p>
        {operator}
        <br />
        Email: {email}
      </p>
    </>
  );
}
