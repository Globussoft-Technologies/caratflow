export const metadata = { title: "Privacy Policy | CaratFlow" };

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-serif)" }}>
        Privacy Policy
      </h1>
      <p className="text-navy/60 text-sm mb-8">Last updated: April 2026</p>

      <div className="space-y-5 text-navy/80 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">What we collect</h2>
          <p>
            We collect the information you give us when you create an account, place an order, request a
            consultation, or subscribe to the newsletter -- name, email, phone, shipping address, and order
            history. We also collect basic device information (browser, IP, screen size) to keep the site
            secure and to fix bugs.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">How we use it</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To process your orders and deliver your jewelry</li>
            <li>To send transactional emails / SMS / WhatsApp (order confirmations, shipping updates)</li>
            <li>To respond to support requests and consultation bookings</li>
            <li>To send marketing emails -- only if you have explicitly opted in</li>
            <li>To detect fraud and protect the site from abuse</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">Who we share with</h2>
          <p>
            We share data only with the partners who help us deliver your order: payment gateways (Razorpay),
            shipping insurers (Sequel / Brinks), and SMS / email providers. We do not sell your data.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">Your rights</h2>
          <p>
            You can request a copy or deletion of your data at any time by writing to{" "}
            <a href="mailto:privacy@caratflow.com" className="text-gold">privacy@caratflow.com</a>. You can
            also delete your account from the My Account page.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">Cookies</h2>
          <p>
            We use a minimal set of cookies for cart persistence, authentication, and basic analytics. We do
            not run third-party advertising trackers.
          </p>
        </section>
      </div>
    </div>
  );
}
