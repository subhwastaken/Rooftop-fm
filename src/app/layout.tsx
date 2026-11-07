import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap"
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rooftop.fm"),
  title: "Rooftop.fm — listen together, in sync",
  description:
    "Shared music & intimate moments, under the same sky. Make a channel, share the code, and listen together in sync — pause for one, pause for both.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  },
  openGraph: {
    title: "Rooftop.fm — listen together, in sync",
    description:
      "Shared music & intimate moments, under the same sky. Make a channel, share the code, and listen together in sync.",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "Rooftop.fm" }]
  },
  manifest: "/site.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#140d10",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable}`}>
      <body className="font-sans antialiased selection:bg-[#ffb36b] selection:text-[#2b1416]">{children}</body>
    </html>
  );
}
