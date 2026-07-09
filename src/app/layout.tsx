import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StockNova — The universe of media, one search away.",
  description:
    "StockNova is a universal stock media discovery portal. Search once and discover images, videos, audio, PDFs, documents and web/social content from across the whole web.",
  keywords: [
    "StockNova",
    "stock media",
    "image search",
    "video search",
    "audio search",
    "PDF",
    "free stock assets",
  ],
  authors: [{ name: "StockNova" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "StockNova — The universe of media, one search away.",
    description:
      "A universal stock media discovery portal aggregating images, videos, audio, PDFs and web content from across the internet.",
    siteName: "StockNova",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StockNova",
    description:
      "The universe of media, one search away.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
