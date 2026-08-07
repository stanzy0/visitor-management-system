import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BrandingProvider from "@/components/BrandingProvider";
import { NotificationProvider } from "@/contexts/NotificationContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VMS Admin - Visitor Management System",
  description: "Admin dashboard for visitor management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col w-full">
        <BrandingProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </BrandingProvider>
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            fontSize: '10px',
            padding: '4px 8px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
          }}
        >
          BUILD: 2026-08-06-Responsive-Fix-v2
        </div>
      </body>
    </html>
  );
}
