import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#05060a",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://offprint.app"),
  title: "Offprint — Any page. Your file.",
  description:
    "Turn any article into a clean PDF, DOCX, or Markdown file. Free. No signup. Nothing stored.",
  openGraph: {
    title: "Offprint — Any page. Your file.",
    description: "Turn any article into a clean PDF, DOCX, or Markdown file. Free. No signup.",
    url: "https://offprint.app",
    siteName: "Offprint",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Offprint — any page, your file." }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Offprint — Any page. Your file.",
    description: "Turn any article into a clean PDF, DOCX, or Markdown file. Free. No signup.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} antialiased`}>
      <body className="grain min-h-screen">{children}</body>
    </html>
  );
}
