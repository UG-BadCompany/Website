import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";

export const metadata: Metadata = {
  title: {
    default: "T&A Contracting | Arizona Maintenance, Repairs & Improvements",
    template: "%s | T&A Contracting",
  },
  description:
    "Arizona-native contracting, maintenance, repairs, installations, improvements, rental support, and property maintenance with professional communication from quote to completion.",
  keywords: [
    "Arizona contractor",
    "property maintenance Arizona",
    "home repairs Arizona",
    "handyman services Arizona",
    "T&A Contracting",
  ],
  openGraph: {
    title: "T&A Contracting | Maintenance. Anything. Everything.",
    description:
      "More than a handyman. Arizona contracting and maintenance done right for homes, rentals, properties, and small businesses.",
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
