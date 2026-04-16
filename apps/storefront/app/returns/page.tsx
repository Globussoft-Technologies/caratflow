export const metadata = {
  title: "Returns & Exchange | CaratFlow",
};

export default function ReturnsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>
        Returns & Exchange
      </h1>
      <div className="space-y-5 text-navy/80 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">15-day no-questions-asked return</h2>
          <p>
            If you are not completely satisfied with your purchase, you can return it within 15 calendar days
            of delivery for a full refund. The piece must be unworn, in its original packaging, and accompanied
            by the original invoice and certificate.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">How to start a return</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Go to <strong>My Account &gt; Orders</strong> and open the order.</li>
            <li>Click <strong>Request Return</strong>, select the items, and pick a reason.</li>
            <li>We will arrange a free, insured pickup from your address.</li>
            <li>Once the piece is verified at our quality desk we issue your refund -- typically within 5
              business days.</li>
          </ol>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">Exchanges & Buy-back</h2>
          <p>
            For exchanges within 30 days we credit 100% of the metal value at the prevailing rate. After 30
            days the standard buy-back schedule applies (see invoice for details).
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">Non-returnable</h2>
          <p>
            Engraved pieces, custom-made jewelry, and nose-pins / earrings (for hygiene reasons) cannot be
            returned. Loose stones once set into a piece are non-returnable.
          </p>
        </section>
      </div>
    </div>
  );
}
