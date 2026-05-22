import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { APP_NAME } from "@/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} — AI WhatsApp Assistant`,
  description:
    "Premium AI-powered WhatsApp assistant for modern businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full bg-[#F8FAFC] text-slate-900"
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
