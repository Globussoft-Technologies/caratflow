export const metadata = {
  title: "Shipping Policy | CaratFlow",
};

export default function ShippingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>
        Shipping Policy
      </h1>
      <div className="space-y-5 text-navy/80 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">Free insured shipping over Rs. 2,000</h2>
          <p>
            Every order is shipped fully insured for its declared value via Sequel / Brinks. You do not pay
            extra for insurance -- it is included in the shipping cost.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">Delivery Timelines</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Metro cities: 3 - 5 business days</li>
            <li>Non-metro towns: 5 - 7 business days</li>
            <li>Made-to-order pieces: 14 - 21 business days from confirmation</li>
            <li>International (Tier 1 countries): 7 - 10 business days</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">Tracking</h2>
          <p>
            You will receive a tracking link by email and SMS as soon as your shipment is dispatched. You can
            also see live tracking on the order detail page in your account.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">Verification on Delivery</h2>
          <p>
            For orders above Rs. 50,000 the courier may ask for a government-issued photo ID at the time of
            delivery. This is for your protection.
          </p>
        </section>
      </div>
    </div>
  );
}
