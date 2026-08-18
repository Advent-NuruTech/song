import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Advent Pro Admin",
  description: "Content management for Advent Pro",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
