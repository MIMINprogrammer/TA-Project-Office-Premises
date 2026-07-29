import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pepper Labs — Sistem Semakan Klausa Perjanjian Penyewaan",
  description:
    "Tenancy Agreement Clause Review & Amendment System — Pepper Labs Malaysia. Memudahkan Business Unit menyediakan draf dan Senior Legal Officer menyemak pindaan secara cekap dan telus.",
  keywords: [
    "Pepper Labs",
    "Tenancy Agreement",
    "Clause Review",
    "Legal",
    "Malaysia",
    "PERKESO",
  ],
  authors: [{ name: "Pepper Labs — Pasukan Kejuruteraan Perisian" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {/* Aurora glassmorphism background (fixed, behind everything) */}
          <div className="glass-aurora" aria-hidden />
          {children}
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
