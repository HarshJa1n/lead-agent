import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Review Slack Agent",
  description: "Slack lead review agent powered by Vercel Workflow and Claude Managed Agents.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
