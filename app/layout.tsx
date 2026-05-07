import type { Metadata } from "next";
import "./globals.css";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";

export const metadata: Metadata = {
  title: {
    default: "T&A Contracting | Arizona Maintenance & Improvements",
    template: "%s | T&A Contracting",
  },
  description: "More than a handyman. Arizona-native contracting, repairs, maintenance, installations, improvements, and property support.",
  keywords: ["T&A Contracting", "Arizona contractor", "Phoenix home repairs", "property maintenance Arizona", "handyman alternative"],
  openGraph: {
    title: "T&A Contracting | Maintenance. Anything. Everything.",
    description: "Arizona-native maintenance, repairs, and improvements done right.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
