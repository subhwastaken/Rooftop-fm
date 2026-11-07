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
  title: "Rooftop.fm — listen together, in sync",
  description:
    "Shared music & intimate moments, under the same sky. Make a channel, share the code, and listen together in sync — pause for one, pause for both."
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
