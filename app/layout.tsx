import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "MEXC Kickoff Markets",
  description: "MEXC football prediction event",
  icons: { icon: "/brand/mexc-logo.svg" },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
