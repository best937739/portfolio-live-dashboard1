import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live Portfolio Dashboard",
  description: "Personal portfolio dashboard with live quote adapter",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
