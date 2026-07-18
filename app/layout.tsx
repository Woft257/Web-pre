import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "MEXC - VUA PHÁ LƯỚI ĐỘC QUYỀN",
  description: "VUA PHÁ LƯỚI ĐỘC QUYỀN dành cho cộng đồng MEXC Việt Nam",
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
