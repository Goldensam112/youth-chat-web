import type { Metadata, Viewport } from "next";
import Script from "next/script"; // ✅ Next.js ka Script component import kiya
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse Match",
  description: "Real-time discovery chat with timed credits.",
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: "#07090f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* ✅ Google AdSense ki Auto-Ads Script clean tarike se head mein add ho gayi */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2192077753906094"
          crossorigin="anonymous"
          strategy="afterInteractive" // Yeh page load hone ke baad silently ads load karega taaki chat lag na ho
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
