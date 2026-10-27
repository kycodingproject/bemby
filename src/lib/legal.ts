/**
 * Details shown on the public legal pages. Fill these in before submitting to Meta or Twilio.
 * Anything in [brackets] is a placeholder.
 */
export const LEGAL = {
  appName: "Bemby",
  operator: process.env.NEXT_PUBLIC_LEGAL_OPERATOR?.trim() || "[Your legal name or business name]",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "[your support email]",
  state: process.env.NEXT_PUBLIC_LEGAL_STATE?.trim() || "California",
  effectiveDate: "October 27, 2026",
};
