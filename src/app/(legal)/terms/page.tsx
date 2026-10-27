import { LEGAL } from "@/lib/legal";
import { PLANS } from "@/lib/plans";

export const metadata = { title: "Terms of Service · Bemby" };

export default function TermsPage() {
  const { appName: app, operator, contactEmail: email, state } = LEGAL;
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="muted">Effective {LEGAL.effectiveDate}</p>

      <p>
        These terms are an agreement between you and {operator} for using {app}. By creating an account or using {app}, you agree to them. If you use {app} for a business, you confirm you can agree on its behalf.
      </p>

      <h2>1. What {app} does</h2>
      <p>
        {app} is an AI receptionist. It answers your clients by text message, Instagram and Facebook Messenger, collects booking details, suggests open times, and sends appointment requests to you. {app} never confirms an appointment without your approval. You choose how much it does on its own in Settings, and you can pause it or take over any conversation.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must be at least 18 and give accurate information.</li>
        <li>Keep your password safe. You&apos;re responsible for activity in your account.</li>
        <li>Your business information (services, prices, hours, policies) must be accurate, because {app} relies on it to answer clients.</li>
      </ul>

      <h2>3. Plans and billing</h2>
      <ul>
        <li>{PLANS.social.name}: {PLANS.social.price} per month. New accounts can start with a first month for {PLANS.trial.price}, then renew at {PLANS.social.price} per month.</li>
        <li>{PLANS.pro.name}: {PLANS.pro.price} per month, including a business phone number and up to {PLANS.pro.texts.toLocaleString()} texts per month. Extra texts may be offered as an add-on.</li>
        <li>Subscriptions renew automatically each month until canceled. You can cancel anytime in Settings; cancellation takes effect at the end of the current billing period.</li>
        <li>Payments are processed by Stripe. Fees are non-refundable except where required by law. Plan changes may be prorated.</li>
        <li>We may change prices with at least 30 days&apos; notice. Changes apply from your next billing period.</li>
        <li>If a payment fails, {app} may pause until billing is updated.</li>
      </ul>

      <h2>4. Business phone numbers and texting</h2>
      <ul>
        <li>Phone carriers must approve every business that texts clients. Approval usually takes 2–4 days but isn&apos;t guaranteed, and carriers may reject or suspend a registration.</li>
        <li>You must only text people who contacted you or gave you permission, honor STOP requests, and follow the Telephone Consumer Protection Act (TCPA), carrier rules and other laws.</li>
        <li>The number is provided for use with {app}. If your account closes, the number may be released.</li>
      </ul>

      <h2>5. Instagram and Facebook</h2>
      <p>
        When you connect Instagram or Messenger, you also follow Meta&apos;s terms. Meta limits when businesses may reply (for example, within 24 hours of a client&apos;s last message), and {app} follows those limits. Meta may change or restrict these features at any time.
      </p>

      <h2>6. Acceptable use</h2>
      <p>Don&apos;t use {app} to:</p>
      <ul>
        <li>send spam, unsolicited marketing, or messages to people who haven&apos;t contacted you or opted in;</li>
        <li>mislead clients, impersonate others, or offer illegal services;</li>
        <li>collect sensitive information you don&apos;t need, or break privacy laws;</li>
        <li>interfere with, copy or reverse engineer the service.</li>
      </ul>

      <h2>7. AI replies</h2>
      <p>
        {app} uses AI, which can make mistakes, misunderstand a client, or give incomplete answers. You&apos;re responsible for your business information, the settings you choose, and the appointments you approve. Review conversations regularly, and use &ldquo;Ask me first&rdquo; if you want to approve every reply.
      </p>

      <h2>8. Your content</h2>
      <p>
        You and your clients own your content. You give us permission to store, process and transmit it only to provide and improve {app} for you, as described in our <a href="/privacy">Privacy Policy</a>. You confirm you have the right to share client information with us for this purpose.
      </p>

      <h2>9. Ending your account</h2>
      <p>
        You can delete your account anytime in Settings. We may suspend or close accounts that break these terms, don&apos;t pay, or put clients or the service at risk. After closing, we delete your data as described in the Privacy Policy.
      </p>

      <h2>10. Disclaimers</h2>
      <p>
        {app} is provided &ldquo;as is.&rdquo; We work hard to keep it running, but we don&apos;t guarantee it will be uninterrupted or error-free, or that any number of bookings will result. Third-party services (such as carriers, Meta, Twilio and Stripe) are outside our control.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        To the extent the law allows, {operator} isn&apos;t liable for indirect, incidental or lost-profit damages, and our total liability for any claim is limited to the amount you paid us in the 3 months before the claim.
      </p>

      <h2>12. General</h2>
      <ul>
        <li>These terms are governed by the laws of the State of {state}.</li>
        <li>We may update these terms and will notify you of significant changes. Continuing to use {app} after changes means you accept them.</li>
        <li>Questions: {email}</li>
      </ul>
    </>
  );
}
