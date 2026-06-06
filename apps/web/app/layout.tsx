import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brigade — multi-agent restaurant ops",
  description: "Le Kyoto's kitchen brigade of AI agents. Solo agent vs. agent team, scored in Weave.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
