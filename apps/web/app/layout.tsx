import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WeaveHacks 4 — multi-agent spine",
  description: "Neutral demo shell. Project A or B is undecided.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
