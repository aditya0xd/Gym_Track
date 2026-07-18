import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppToaster } from "@/components/providers/AppToaster";
import { PwaInstallPrompt } from "@/components/providers/PwaInstallPrompt";
import { PwaRegister } from "@/components/providers/PwaRegister";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { QueryProvider } from "@/components/providers/Query-provider";
import { SplashHider } from "@/components/providers/SplashHider";
import { CapacitorBackButton } from "@/components/providers/CapacitorBackButton";
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
  title: "Gym Admin Portal",
  description:
    "Login to mint JWT access and refresh tokens for the gym dashboard.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "GymTrack Pro",
  },
  icons: {
    icon: "/icons/pwa-icon.svg",
    apple: "/icons/pwa-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
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
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased">
        <QueryProvider>
          <SessionProvider>
            <PwaRegister />
            {children}
            <AppToaster />
            <PwaInstallPrompt />
          </SessionProvider>
        </QueryProvider>
        <SplashHider />
        <CapacitorBackButton />
      </body>
    </html>
  );
}
