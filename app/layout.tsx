import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TimeProvider } from "./context/TimeContext";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Virtual Office",
  description: "Virtual Office",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <TimeProvider>
          {children}
        </TimeProvider>
      </body>
    </html>
  );
}
