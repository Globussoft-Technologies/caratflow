export const metadata = { title: "Terms of Service | CaratFlow" };

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-serif)" }}>
        Terms of Service
      </h1>
      <p className="text-navy/60 text-sm mb-8">Last updated: April 2026</p>

      <div className="space-y-5 text-navy/80 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">1. Acceptance</h2>
          <p>
            By using caratflow.com you agree to these terms and to our Privacy Policy. If you do not agree,
            please do not use the site.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">2. Pricing</h2>
          <p>
            Prices are quoted in Indian Rupees and are based on the live metal rate at the moment you place
            the order. The metal rate can move between when you add a piece to your cart and when you check
            out -- the price you see at the Pay step is the price that is charged.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">3. Custom Orders</h2>
          <p>
            Custom and made-to-order pieces require a 50% non-refundable advance once the design is signed
            off. The remaining 50% is due before dispatch. Custom orders cannot be returned (see the Returns
            policy).
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">4. Liability</h2>
          <p>
            CaratFlow's total liability for any claim is limited to the amount you paid for the piece in
            question. We are not liable for indirect or consequential damages.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">5. Governing law</h2>
          <p>
            These terms are governed by the laws of India. Any dispute will be resolved in the courts of
            Jaipur, Rajasthan.
          </p>
        </section>
      </div>
    </div>
  );
}
