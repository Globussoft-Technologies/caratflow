import HeroSection from "@/components/HeroSection";
import SectionHeader from "@/components/SectionHeader";
import FeatureCard from "@/components/FeatureCard";
import StatCard from "@/components/StatCard";
import TestimonialCard from "@/components/TestimonialCard";
import Button from "@/components/Button";

const stats = [
  { value: "100+", label: "Features" },
  { value: "13", label: "Integrated Modules" },
  { value: "4", label: "Mobile Apps" },
  { value: "10+", label: "Countries Supported" },
];

const features = [
  {
    title: "Inventory Management",
    description:
      "Karat-wise metal tracking, diamond 4C grading, RFID serialization, multi-location stock with 5 valuation methods.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
  {
    title: "Manufacturing & Production",
    description:
      "Multi-level BOM, MRP, 9-stage job orders, karigar management with metal balance ledger, tunch and wastage calculations.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1M20.25 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3.75 20.25a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0z" />
      </svg>
    ),
  },
  {
    title: "Retail & Point of Sale",
    description:
      "Touch-optimized POS with live metal rates, split payments, old gold exchange, repair tracking, and jewelry-specific invoicing.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
  {
    title: "Financial & Accounting",
    description:
      "Double-entry ledger, full GST compliance, e-invoicing, e-way bills, TDS/TCS, bank reconciliation, and multi-currency support.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "CRM & Loyalty",
    description:
      "Customer 360 view, tiered loyalty programs, digital passbook, WhatsApp/SMS notifications, campaign management, and lead pipeline.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    title: "E-Commerce & Omnichannel",
    description:
      "Shopify integration, marketplace adapters, payment gateways, unified order management, click-and-collect, and catalog sync.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
];

const industryFeatures = [
  { title: "Karigar Management", description: "Track artisan assignments, daily wages, skill levels, and metal balances with precision." },
  { title: "HUID Compliance", description: "Built-in hallmark tracking and BIS submission workflow -- mandatory for gold sales in India." },
  { title: "Girvi Lending", description: "Full mortgage lending module with interest accrual, payment tracking, and auction management." },
  { title: "Live Metal Rates", description: "MCX/IBJA rate integration for real-time gold, silver, and platinum pricing in your POS." },
  { title: "Tunch & Wastage", description: "Native purity and wastage calculations baked into every manufacturing and sales workflow." },
  { title: "Kitty & Gold Schemes", description: "Run monthly savings schemes with bonus months, maturity calculators, and member tracking." },
];

const testimonials = [
  {
    quote:
      "CaratFlow replaced three separate systems we were using. Our inventory accuracy went from 85% to 99.5%, and our karigars love the transparent metal balance tracking.",
    name: "Amit Sharma",
    company: "Sharma Jewellers, Mumbai",
    role: "Managing Director",
  },
  {
    quote:
      "The HUID compliance module alone saved us hundreds of hours. Every piece is tracked from hallmark submission to sale -- our auditors are impressed every time.",
    name: "Priya Mehta",
    company: "Mehta & Sons Gold House, Ahmedabad",
    role: "Operations Head",
  },
  {
    quote:
      "We run 12 retail outlets and the real-time multi-location inventory is a game-changer. The live metal rate integration means our pricing is always accurate.",
    name: "Vikram Choudhary",
    company: "Royal Gold Chain, Jaipur",
    role: "CEO",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <HeroSection />

      {/* Trusted By */}
      <section className="py-12 bg-warm-gray border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm text-gray-500 font-medium mb-6 uppercase tracking-wide">
            Trusted by 500+ jewelers across India
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-40">
            {["Sharma Jewellers", "Mehta Gold", "Royal Diamonds", "Lakshmi Jewels", "Tanishq Partner", "Kalyan Network"].map(
              (name) => (
                <div key={name} className="text-navy font-bold text-lg whitespace-nowrap">
                  {name}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Key Stats */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-20 bg-warm-gray">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeader
            title="Everything Your Jewelry Business Needs"
            subtitle="13 integrated modules covering every aspect of the jewelry lifecycle -- from raw materials to customer delight."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Button variant="secondary" href="/features">
              See All Features
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <SectionHeader
            title="Go Live in 3 Simple Steps"
            subtitle="Getting started with CaratFlow is straightforward. Our team guides you every step of the way."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Sign Up",
                description:
                  "Create your account and get instant access to a fully-featured 14-day trial. No credit card required.",
              },
              {
                step: "2",
                title: "Configure",
                description:
                  "Set up your locations, users, tax rates, and metal rates. Import your existing inventory via CSV or Excel.",
              },
              {
                step: "3",
                title: "Go Live",
                description:
                  "Start billing, manage production orders, and run your business. Our support team is always a call away.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 bg-gold text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-navy mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry-Specific */}
      <section className="py-20 bg-navy">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeader
            title="Built for Jewelry, Not Adapted"
            subtitle="Generic ERPs force jewelers to work around limitations. CaratFlow was designed from the ground up for the jewelry industry."
            light
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {industryFeatures.map((f) => (
              <div
                key={f.title}
                className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
              >
                <h3 className="text-gold font-bold mb-2">{f.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-warm-gray">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeader
            title="Loved by Jewelers"
            subtitle="See why jewelry businesses across India trust CaratFlow to run their operations."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <TestimonialCard key={t.name} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 bg-gradient-to-br from-navy via-navy-light to-navy text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Jewelry Business?
          </h2>
          <p className="text-gray-300 mb-8 text-lg">
            Join 500+ jewelers who have modernized their operations with CaratFlow.
            Start your free 14-day trial today -- no credit card needed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="primary" size="lg" href="/contact">
              Start Free Trial
            </Button>
            <Button variant="secondary" size="lg" href="/contact" className="border-white/30 text-white hover:bg-white hover:text-navy">
              Book a Demo
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
