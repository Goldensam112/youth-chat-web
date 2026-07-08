import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
        {/* ✅ Fixed: 'crossorigin' ko badal kar 'crossOrigin' (Capital O) kar diya hai */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2192077753906094"
          crossOrigin="anonymous" 
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
