import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AppFrame from "./components/AppFrame";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SMILE MATCHING 人材紹介ダッシュボード",
  description: "外国人候補者、企業、海外パートナーをつなぐ社内向け人材紹介システム",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <AppFrame>{children}</AppFrame>
    </html>
  );
}
