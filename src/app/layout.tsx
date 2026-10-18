import type { Metadata, Viewport } from "next";
import { Assistant, Secular_One } from "next/font/google";
import "./globals.css";
import { InstallPrompt } from "@/components/InstallPrompt";

const secular = Secular_One({
  weight: "400",
  subsets: ["hebrew", "latin"],
  variable: "--font-secular",
  display: "swap",
});

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "קיבוץ ניר אליהו - מדיה",
  description: "התמונות והסרטים של קיבוץ ניר אליהו במקום אחד",
  robots: { index: false, follow: false },
  applicationName: "מדיה ניר אליהו",
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  // iPhone: open full screen from the home screen, with this name under the icon.
  appleWebApp: { capable: true, title: "מדיה ניר אליהו", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f4efe3",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={`${secular.variable} ${assistant.variable}`}>
      <body className="min-h-dvh bg-paper text-ink antialiased">
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
