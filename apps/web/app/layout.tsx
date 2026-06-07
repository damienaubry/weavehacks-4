import type { Metadata } from "next";
import "./globals.css";
import { Backdrop } from "./components/Backdrop";

export const metadata: Metadata = {
  title: "Brigade — multi-agent restaurant ops",
  description: "Le Kyoto's kitchen brigade of AI agents. Solo agent vs. agent team, scored in Weave.",
};

// Apply the saved theme before first paint (no flash). Dark is the default (no attribute).
const NO_FLASH = `(function(){try{if(localStorage.getItem('brigade-theme')==='light')document.documentElement.dataset.theme='light';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body>
        <div className="app-shell">
          <Backdrop />
          {children}
        </div>
      </body>
    </html>
  );
}
