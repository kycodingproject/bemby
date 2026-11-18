/** The Settings tabs, one per card (shared by the server page and the tab bar). */
export const SETTINGS_TABS = [
  { id: "business", label: "Business information" },
  { id: "services", label: "Services & pricing" },
  { id: "hours", label: "Hours" },
  { id: "receptionist", label: "AI receptionist" },
  { id: "channels", label: "Connect" },
  { id: "calendar", label: "Calendar sync" },
  { id: "plan", label: "Plan & account" },
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];
