import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { scheduleCleanup } from '@/lib/cleanup';
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
if (typeof window === 'undefined') {
  scheduleCleanup();
}
export const metadata: Metadata = {
  title: "sxbin.gay | Simple File Uploads",
  description: "A simple, no-registration file upload service",
  metadataBase: new URL('https://sxbin.gay'),
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased bg-[#121212] text-white min-h-screen`}>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}