import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { StagewiseToolbar } from "@/components/StagewiseToolbar";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Agartha AI | Intelligent Compliance Automation",
  description: "AI-powered compliance automation for modern business. Healthcare advertising, financial services, and data privacy compliance made simple.",
  keywords: ["AI", "compliance", "automation", "healthcare", "advertising", "regulatory", "Agartha"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${instrumentSans.variable} ${jetbrainsMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-instrument-sans), system-ui, sans-serif" }}
      >
        <StagewiseToolbar />
        {children}
      </body>
    </html>
  );
}
