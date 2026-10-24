import { Manrope, Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { AuthProvider } from "@/lib/auth/useAuth";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: {
    template: "%s | Fluently",
    default: "Fluently — Build Confidence in English, One Sentence at a Time",
  },
  description:
    "A premium, editorial English language-learning web application for shadowing, dictation, grammar, and vocabulary practice.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/images/logo.png", type: "image/png" },
    ],
    apple: "/apple-icon.png",
    shortcut: "/icon.png",
  },
};

export const viewport = {
  themeColor: "#F5F2EA",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-[#F5F2EA] text-[#30362F]">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
