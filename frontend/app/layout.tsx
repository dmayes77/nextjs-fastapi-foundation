import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { serverEnv } from "@/lib/env/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Next.js + FastAPI + PostgreSQL",
  description:
    "A production-ready full-stack boilerplate built with Next.js, FastAPI, PostgreSQL, SQLAlchemy, and Alembic.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Referencing serverEnv here ensures required environment variables are
  // validated as soon as the application builds or starts.
  void serverEnv;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
