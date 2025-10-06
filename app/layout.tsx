import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PingWidget from "./PingWidget/page";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nova Confessions",
  description: "Anonymous confessions platform for students, fun and secure",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  twitter: {
    card: "summary_large_image",
    site: "@NovaConfessions",
    title: "Nova Confessions",
    description: "Share and read anonymous confessions",
    images: ["/logo.png"],
  },
  openGraph: {
    title: "Nova Confessions",
    description: "Anonymous confessions platform for students",
    url: "https://yourdomain.com",
    siteName: "Nova Confessions",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 text-gray-100`}
      >
        <div className="min-h-screen flex flex-col">
          {children}
          <PingWidget />
        </div>
      </body>
    </html>
  );
}
