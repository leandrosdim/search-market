import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Search Market Intelligence",
  description: "Dashboard for software market opportunity research runs and scores.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
