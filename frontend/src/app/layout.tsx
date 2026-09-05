import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kanban",
  description: "A small, focused board for tracking work across a team.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
