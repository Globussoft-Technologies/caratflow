import type { Metadata } from "next";
import StoreProvider from "@/components/StoreProvider";
import Header from "@/components/Header";
import LiveRateTicker from "@/components/LiveRateTicker";
import CartDrawer from "@/components/CartDrawer";
import CompareBar from "@/components/CompareBar";
import ChatWidget from "@/components/ChatWidget";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CaratFlow -- Premium Jewelry Online Store",
    template: "%s | CaratFlow Jewelry",
  },
  description:
    "Shop certified gold, diamond, silver & platinum jewelry online. BIS Hallmarked, IGI Certified. Free shipping, 15-day returns. Trusted by 50,000+ customers across India.",
  keywords: [
    "buy gold jewelry online",
    "diamond jewelry",
    "gold necklace",
    "gold ring",
    "gold earrings",
    "wedding jewelry",
    "BIS hallmark jewelry",
    "certified diamond jewelry",
    "gold bangles online",
    "platinum rings",
  ],
  openGraph: {
    title: "CaratFlow -- Premium Jewelry Online Store",
    description:
      "Shop BIS Hallmarked gold, IGI certified diamonds, and exquisite silver jewelry. Free shipping on all orders.",
    url: "https://caratflow.globusdemos.com",
    siteName: "CaratFlow",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "CaratFlow -- Premium Jewelry Online Store",
    description: "Shop certified jewelry online. Gold, Diamond, Silver & Platinum.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <StoreProvider>
          <LiveRateTicker />
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <CartDrawer />
          <CompareBar />
          <ChatWidget />
        </StoreProvider>
      </body>
    </html>
  );
}
