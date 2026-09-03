import type { ReactNode } from "react";

export const metadata = { title: "toonstrip + Next.js" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
