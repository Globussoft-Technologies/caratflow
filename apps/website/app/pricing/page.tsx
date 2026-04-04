import type { Metadata } from "next";
import PricingCard from "@/components/PricingCard";
import FaqAccordion from "@/components/FaqAccordion";
import SectionHeader from "@/components/SectionHeader";
import Button from "@/components/Button";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for jewelry businesses of every size. Start with a 14-day free trial -- no credit card required.",
};

const plans = [
  {
    name: "Starter",
    description: "For small retail jewelers",
    priceINR: "\u20B94,999",
    priceUSD: "or $59/month",
    features: [
      "Up to 3 users",
      "1 location",
      "POS + Inventory + CRM",
      "Basic sales & stock reports",
      "Live metal rate integration",
      "Old gold purchase & exchange",
      "HUID tracking",
      "Email support",
    ],
  },
  {
    name: "Professional",
    description: "For growing jewelry businesses",
    priceINR: "\u20B914,999",
    priceUSD: "or $179/month",
    popular: true,
    features: [
      "Up to 15 users",
      "Up to 5 locations",
      "All 14 modules included",
      "Advanced reports + custom report builder",
      "E-commerce integration (1 channel)",
      "Manufacturing & job order management",
      "Girvi, kitty & gold savings schemes",
      "Multi-currency support",
      "WhatsApp & SMS notifications",
      "Priority support (phone + email)",
    ],
  },
  {
    name: "Enterprise",
    description: "For large chains & manufacturers",
    priceINR: "Custom",
    priceUSD: "Contact us for pricing",
    ctaLabel: "Contact Sales",
    features: [
      "Unlimited users & locations",
      "All modules + full API access",
      "Multi-currency & multi-country",
      "Dedicated account manager",
      "Custom integrations & workflows",
      "SLA guarantee (99.9% uptime)",
      "On-premise deployment option",
      "Data migration assistance",
      "Custom training & onboarding",
    ],
  },
];

const faqs = [
  {
    question: "Is there a free trial?",
    answer:
      "Yes! Every plan comes with a 14-day free trial with full access to all features. No credit card required to start. At the end of your trial, you can choose the plan that fits your business.",
  },
  {
    question: "Can I switch plans later?",
    answer:
      "Absolutely. You can upgrade or downgrade your plan at any time. When upgrading, you get immediate access to the new features. When downgrading, the change takes effect at the start of your next billing cycle.",
  },
  {
    question: "Do you offer annual billing discounts?",
    answer:
      "Yes, we offer a 20% discount on annual billing. Pay for 10 months and get 12 months of access. Contact our sales team for annual billing options.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer:
      "Your data remains accessible for 30 days after cancellation. You can export all your data (inventory, customers, transactions, reports) in CSV or Excel format at any time. We never hold your data hostage.",
  },
  {
    question: "Can you help migrate data from my current system?",
    answer:
      "Yes. CaratFlow includes a built-in data import wizard that supports CSV and Excel files with column mapping. For Enterprise customers, our team provides hands-on migration assistance from systems like Tally, Busy, or any custom software you currently use.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Security is our top priority. All data is encrypted at rest and in transit (TLS 1.3). We use multi-tenant architecture with strict tenant isolation. Every data change is logged in a comprehensive audit trail. Enterprise customers can opt for on-premise deployment.",
  },
  {
    question: "Do you support multiple GST registrations?",
    answer:
      "Yes. CaratFlow supports multiple GSTIN numbers across different locations. Each branch can have its own GST registration, and the system automatically handles CGST/SGST for intra-state and IGST for inter-state transactions.",
  },
  {
    question: "What kind of support do you offer?",
    answer:
      "Starter plans include email support (response within 24 hours). Professional plans include priority phone and email support (response within 4 hours). Enterprise customers get a dedicated account manager, custom SLA, and 24/7 emergency support.",
  },
  {
    question: "Can I use CaratFlow for both retail and wholesale?",
    answer:
      "Yes. CaratFlow handles both retail and wholesale operations in a single platform. You get POS billing for walk-in customers, purchase order management for suppliers, consignment tracking, credit limits, and agent commission management -- all integrated.",
  },
  {
    question: "Does CaratFlow work on mobile devices?",
    answer:
      "CaratFlow includes 4 dedicated mobile apps: an Owner App for KPI dashboards and approvals, a Sales Staff App for quick billing and stock checks, a Customer App for loyalty and scheme tracking, and an Agent App for collections and order booking. Available on both iOS and Android.",
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-navy via-navy-light to-navy pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent <span className="text-gold">Pricing</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Plans for every jewelry business -- from single-store retailers to
            multi-city chains. Start with a 14-day free trial.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-warm-gray">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {plans.map((plan) => (
              <PricingCard key={plan.name} {...plan} />
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-8">
            All prices exclude applicable taxes. Prices shown in INR for Indian customers and USD for international customers.
          </p>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <SectionHeader
            title="All Plans Include"
            subtitle="Core capabilities that come standard with every CaratFlow plan."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              "Live metal rate integration",
              "HUID compliance tracking",
              "Old gold purchase & exchange",
              "GST-compliant invoicing",
              "Customer management (CRM)",
              "Mobile-responsive dashboard",
              "Data import/export (CSV/Excel)",
              "SSL encryption & data security",
              "Regular updates & new features",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                <svg className="w-5 h-5 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {feature}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-warm-gray">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <SectionHeader
            title="Frequently Asked Questions"
            subtitle="Everything you need to know about CaratFlow pricing and plans."
          />
          <FaqAccordion items={faqs} />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-navy text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-white mb-4">
            Still Have Questions?
          </h2>
          <p className="text-gray-300 mb-8">
            Our team is happy to walk you through CaratFlow and help you find the
            right plan for your business.
          </p>
          <Button variant="primary" size="lg" href="/contact">
            Talk to Sales
          </Button>
        </div>
      </section>
    </>
  );
}
