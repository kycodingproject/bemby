import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/sora";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bemby",
  description: "Your AI receptionist for texts and DMs.",
  icons: { icon: "/bemby-logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
