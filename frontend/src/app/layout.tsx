import type { Metadata } from "next";
import { DM_Sans, Geist, Geist_Mono, Playfair_Display } from "next/font/google";

import { AuthProvider } from "@/contexts/auth-context";
import { CurrencyProvider } from "@/contexts/currency-context";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  style: ["italic"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "BlueWave Skincare",
  description: "Skincare admin and customer dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} ${playfairDisplay.variable}`}
    >
      <body>
        <AuthProvider>
          <CurrencyProvider>{children}</CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
