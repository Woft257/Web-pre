import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "MEXC World Cup 2026 Prediction",
  description: "Sự kiện dự đoán chung kết World Cup 2026 dành cho cộng đồng MEXC Việt Nam",
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
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
