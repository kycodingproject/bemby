/** The Settings tabs, one per card (shared by the server page and the tab bar). */
export const SETTINGS_TABS = [
  { id: "business", label: "Business" },
  { id: "services", label: "Services" },
  { id: "hours", label: "Hours" },
  { id: "receptionist", label: "Receptionist" },
  { id: "channels", label: "Messaging" },
  { id: "calendar", label: "Calendar" },
  { id: "plan", label: "Plan & account" },
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];
