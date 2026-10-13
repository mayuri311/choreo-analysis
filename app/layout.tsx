import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Choreo Review",
  description: "Timestamped peer review for team practice and retention videos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Suspense fallback={<div className="h-14 border-b border-line bg-white" />}>
          <NavBar />
        </Suspense>
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
