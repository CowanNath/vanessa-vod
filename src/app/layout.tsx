import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProvider } from "../providers/AppProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Vanessa你看不看",
  description: "在线影视播放平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen flex flex-col">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
