import type { Metadata } from "next";
import SectionHeader from "@/components/SectionHeader";
import Button from "@/components/Button";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore CaratFlow's 100+ features across 14 modules -- inventory, manufacturing, POS, accounting, CRM, e-commerce, compliance, and more.",
};

interface Module {
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}

const modules: Module[] = [
  {
    name: "Inventory Management",
    description: "Track every gram of metal and every stone with precision across all your locations.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    features: [
      "Real-time tracking for metals, stones, and finished goods",
      "Karat-wise / purity-based inventory with 5 valuation methods (FIFO, weighted average, last purchase, gross profit, market value)",
      "Batch/lot management for diamonds and gemstones",
      "Diamond tracking by 4Cs (Cut, Clarity, Color, Carat)",
      "Lab-grown diamond attribute handling",
      "Serialized item tracking with RFID, barcode, and QR code support",
      "Multi-location / multi-branch inventory with inter-location transfers",
      "Metal recovery tracking and calculations",
      "Stock take / physical audit workflow with variance detection",
    ],
  },
  {
    name: "Manufacturing & Production",
    description: "End-to-end production management from BOM creation to finished goods.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1M20.25 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3.75 20.25a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0z" />
      </svg>
    ),
    features: [
      "Multi-level Bill of Materials (BOM) engine with explosion",
      "Material Requirement Planning (MRP)",
      "Production planning and capacity analysis",
      "9-stage job order lifecycle (Draft > Planned > Material Issued > In Progress > QC Pending > QC Passed > Completed)",
      "Karigar (artisan) management -- task assignment, daily wages, skill tracking",
      "Karigar metal balance ledger (issued vs. returned vs. wasted)",
      "WIP monitoring with stage-gate tracking",
      "Quality control checkpoints with pass/fail/rework",
      "Tunch (purity) and wastage calculations",
      "Job costing (materials + labor + overhead)",
      "Assembly / disassembly support",
    ],
  },
  {
    name: "Retail & Point of Sale",
    description: "A POS system that understands jewelry pricing, old gold exchange, and live metal rates.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    features: [
      "Touch-optimized POS interface with barcode scanner and weighing scale integration",
      "Jewelry-specific pricing: (Metal Rate x Weight) + Making Charges + Wastage + GST",
      "Live metal rate integration for real-time pricing",
      "Split payment support (Cash + Card + UPI + Old Gold + Loyalty Points)",
      "Old gold purchase with purity testing workflow and exchange against new purchases",
      "Repair order tracking with profitability analysis",
      "Custom/bespoke order management linked to manufacturing",
      "Layaway / installment management",
      "Appraisal management",
      "Discount engine (percentage, fixed, buy-X-get-Y)",
      "Gift cards and vouchers",
      "Invoice generation with item images, HUID details, weight/purity specs",
    ],
  },
  {
    name: "Financial & Accounting",
    description: "Complete double-entry accounting with built-in Indian tax compliance.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    features: [
      "Double-entry general ledger with chart of accounts",
      "Accounts Payable / Accounts Receivable with aging",
      "Full GST compliance (CGST/SGST auto-split for intra-state, IGST for inter-state)",
      "3% jewelry GST (HSN 7113), 5% on making charges",
      "TDS (Section 194Q) and TCS (Section 206C) with threshold tracking",
      "E-invoicing and E-Way Bill generation",
      "GSTR-1 and GSTR-3B worksheet generation",
      "Bank reconciliation with auto-matching",
      "Multi-currency support with exchange rate management",
      "Profit & Loss, Balance Sheet, Trial Balance, Cash Flow statements",
      "Cost center tracking and margin enforcement rules",
    ],
  },
  {
    name: "CRM & Customer Management",
    description: "Build lasting relationships with your customers through data-driven engagement.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    features: [
      "Customer 360 view (profile + purchases + loyalty + interactions + feedback)",
      "Loyalty engine with points, tiers, earning rules, and redemption",
      "Digital passbook for customers (schemes, loyalty, purchase history)",
      "Notification engine (WhatsApp, SMS, Email) with templates",
      "Birthday / anniversary reminders with auto-notifications",
      "Marketing campaign management with audience segmentation",
      "Lead management pipeline (New > Contacted > Qualified > Won)",
      "Customer feedback collection and analysis",
      "Occasion tracking and personalized marketing",
    ],
  },
  {
    name: "Wholesale & Distribution",
    description: "Manage your supplier relationships, purchase orders, and consignment inventory.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    features: [
      "Purchase order management with approval workflow",
      "Goods receipt with 3-way matching (PO, receipt, invoice)",
      "Outgoing consignment / memo tracking (every gram accounted for)",
      "Incoming consignment management",
      "Supplier rate contracts",
      "Agent/broker commission management (percentage, fixed per unit, fixed per weight)",
      "Credit limit management with automatic enforcement",
      "Outstanding payment tracking with aging buckets (30/60/90/120+ days)",
    ],
  },
  {
    name: "E-Commerce & Omnichannel",
    description: "Sell online and in-store with unified inventory, orders, and customer data.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    features: [
      "Shopify integration (product sync, order import, inventory sync)",
      "Marketplace adapters (Amazon, Flipkart)",
      "Payment gateway integration (Razorpay, Stripe, PayU)",
      "Shipping integration (Shiprocket, Delhivery)",
      "Omnichannel order management (unified orders from all channels)",
      "Click-and-collect (buy online, pick up in store)",
      "Product catalog sync with channel-specific pricing",
      "Webhook handling with HMAC verification",
      "Product review moderation",
    ],
  },
  {
    name: "Export & International Trade",
    description: "Manage international orders, customs documentation, and multi-currency invoicing.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
      </svg>
    ),
    features: [
      "Export invoice generation with LUT (Letter of Undertaking) for zero-rated IGST",
      "Multi-currency invoicing with exchange rate locking",
      "HS code reference browser (Chapter 71 for jewelry)",
      "Customs duty calculator by destination country",
      "Shipping document generation (packing list, shipping bill, certificate of origin, ARE-1/ARE-3, GR form)",
      "DGFT license tracking (Advance License, DFIA, EPCG, MEIS, RODTEP) with utilization monitoring",
      "Country-specific compliance checker",
      "IE Code and AD Code management",
    ],
  },
  {
    name: "Compliance & Traceability",
    description: "Stay compliant with HUID, BIS hallmarking, Kimberley Process, and audit requirements.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    features: [
      "HUID (Hallmark Unique Identification) tracking and enforcement",
      "BIS hallmark submission workflow (submit > test > pass/fail > HUID assignment)",
      "Gemstone certificate management (GIA, IGI, HRD, SGL)",
      "Full chain-of-custody traceability (source to sale)",
      "Kimberley Process compliance for diamonds",
      "Conflict-free sourcing documentation",
      "Insurance policy tracking with coverage monitoring",
      "Compliance audit scheduling and findings tracking",
    ],
  },
  {
    name: "India-Specific Features",
    description: "Girvi lending, kitty schemes, gold savings, MCX rates, UPI, Aadhaar KYC, and more.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    features: [
      "Girvi (Mortgage Lending): Loan creation, collateral tracking, interest accrual (simple/compound), payment allocation, auction workflow, KYC enforcement",
      "Kitty / Chit Schemes: Scheme creation, member enrollment, installment tracking, maturity handling",
      "Gold Savings Schemes: Monthly deposits with bonus months (pay 11, get 12), maturity calculator",
      "MCX/IBJA Live Rates: Manual entry + API integration, in-memory cache for real-time pricing",
      "UPI Payment Integration: QR code generation and payment verification",
      "Aadhaar eKYC & PAN Verification: Document validation with format checks",
      "Indian Banking: NEFT/RTGS/IMPS reference templates",
    ],
  },
  {
    name: "Reporting & Analytics",
    description: "Configurable dashboards and deep analytics to power data-driven decisions.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    features: [
      "Configurable dashboard with drag-and-drop widgets",
      "Sales reports (daily summary, by product/salesperson/location/category, period comparison)",
      "Inventory reports (stock summary, low stock, dead stock, fast/slow movers, aging)",
      "Manufacturing reports (job summary, karigar performance, wastage, cost analysis)",
      "CRM reports (acquisition, retention, lifetime value, loyalty metrics, lead funnel)",
      "Demand forecasting (simple moving average + exponential smoothing)",
      "Custom report builder (select entity, columns, filters, grouping, aggregations)",
      "Scheduled report delivery (PDF/Excel/CSV via email)",
      "Tax reports (GSTR-1, GSTR-3B, TDS/TCS registers) and audit trail reports",
    ],
  },
  {
    name: "Hardware Integration",
    description: "Connect RFID readers, barcode scanners, weighing scales, label printers, and more.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
      </svg>
    ),
    features: [
      "RFID Readers: Tag scanning, product lookup, RFID-based stock taking, anti-theft detection",
      "Barcode Scanners: Keyboard wedge mode detection, product lookup, bulk barcode generation",
      "Weighing Scales: Real-time weight capture via WebSocket, tare handling, tolerance validation",
      "Label Printers: Template designer, jewelry-specific labels (SKU, weight, purity, HUID, price, barcode), ZPL output",
      "Customer-Facing Displays: VFD message formatting (product info, running total, amount due)",
      "Biometric Attendance: Check-in/check-out linked to karigar attendance records",
    ],
  },
  {
    name: "Mobile Applications",
    description: "Four purpose-built mobile apps for owners, sales staff, customers, and agents.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    features: [
      "Owner App: KPI dashboard, approval workflows, report summaries, metal rate entry",
      "Sales Staff App: Quick billing with barcode scan, customer lookup, stock check, daily summary",
      "Customer App: Digital passbook, loyalty points, scheme tracking, product catalog, store locator",
      "Agent App: Collection tracking, visit logging, order booking, commission dashboard",
    ],
  },
  {
    name: "Platform & Infrastructure",
    description: "Enterprise-grade architecture with multi-tenancy, RBAC, audit trails, and real-time sync.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
      </svg>
    ),
    features: [
      "Multi-tenant architecture (tenant isolation via tenantId on every table)",
      "Role-based access control (RBAC) with granular permissions per module/resource/action",
      "Multi-branch management with branch-level settings",
      "Real-time sync via WebSocket",
      "Data import/export (CSV/Excel) with column mapping wizard",
      "Comprehensive audit trail (every data change logged with before/after values)",
      "Multi-language support infrastructure (English, Hindi, Tamil, and more)",
      "File management (S3-compatible storage for images, documents, certificates)",
      "Automated backup scheduling and in-app notifications with real-time push",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-navy via-navy-light to-navy pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            100+ Features Across <span className="text-gold">14 Modules</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Every feature purpose-built for the jewelry industry. No workarounds,
            no compromises -- just tools that understand your business.
          </p>
        </div>
      </section>

      {/* Module List */}
      <section className="py-20 bg-warm-gray">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
          {modules.map((mod, idx) => (
            <div
              key={mod.name}
              id={mod.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
              className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-gray-100"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 bg-gold/10 text-gold rounded-xl flex items-center justify-center flex-shrink-0">
                  {mod.icon}
                </div>
                <div>
                  <div className="text-xs text-gold font-semibold mb-1 uppercase tracking-wide">
                    Module {idx + 1}
                  </div>
                  <h2 className="text-2xl font-bold text-navy">{mod.name}</h2>
                  <p className="text-gray-600 mt-1">{mod.description}</p>
                </div>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {mod.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg
                      className="w-5 h-5 text-gold flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <SectionHeader
            title="See CaratFlow in Action"
            subtitle="Book a personalized demo and see how these features work together for your jewelry business."
          />
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="primary" size="lg" href="/contact">
              Book a Demo
            </Button>
            <Button variant="secondary" size="lg" href="/pricing">
              View Pricing
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
