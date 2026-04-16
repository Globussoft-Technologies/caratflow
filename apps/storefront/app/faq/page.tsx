export const metadata = { title: "FAQ | CaratFlow" };

const faqs = [
  {
    q: "Is the gold BIS hallmarked?",
    a: "Yes. Every gold and silver piece we sell is BIS hallmarked. The hallmark stamp and the unique HUID are visible on the piece and recorded on your invoice.",
  },
  {
    q: "Are diamonds certified?",
    a: "All natural diamonds above 0.18ct ship with an IGI or GIA certificate. Smaller melee diamonds are covered by an in-house grading report from our gemological lab.",
  },
  {
    q: "How is the price calculated?",
    a: "Total = Metal value (live rate x net weight) + Making charges + Stone charges + 3% GST on jewelry + 5% GST on making charges. Every line is itemized on your invoice.",
  },
  {
    q: "Do you ship internationally?",
    a: "Yes -- we ship to 30+ countries via Brinks fully insured. Customs duties at the destination are payable by the buyer.",
  },
  {
    q: "Can I return a piece?",
    a: "Yes, within 15 days of delivery. See our Returns & Exchange page for the full process.",
  },
  {
    q: "Do you do custom design?",
    a: "Absolutely. Book a free video consultation with one of our designers from /consultation/request and we will mock up a 3D rendering before any work begins.",
  },
  {
    q: "Is COD available?",
    a: "Yes, on orders up to Rs. 50,000. Larger orders must be paid via UPI / card / netbanking through Razorpay.",
  },
];

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-8" style={{ fontFamily: "var(--font-serif)" }}>
        Frequently Asked Questions
      </h1>
      <div className="space-y-4">
        {faqs.map((f) => (
          <details key={f.q} className="bg-white rounded-xl border border-gray-100 p-5 group">
            <summary className="font-semibold text-navy cursor-pointer flex items-center justify-between">
              {f.q}
              <span className="text-gold text-xl group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="text-sm text-navy/70 mt-3 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
