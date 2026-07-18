import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";
import { Toaster } from "sonner";
import { GlobalToaster } from "@/components/shared/GlobalToaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StudentOS",
    template: "%s · StudentOS",
  },
  description:
    "Attendance, batches, and organization management for coaching centers and student communities.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <GlobalToaster />
      </body>
    </html>
  );
}
