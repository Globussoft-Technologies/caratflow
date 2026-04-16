export const metadata = { title: "BIS Hallmark | CaratFlow" };

export default function BISHallmarkPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-serif)" }}>
        BIS Hallmark Guarantee
      </h1>
      <p className="text-navy/60 text-sm mb-8">
        100% of the gold and silver jewelry we sell carries a BIS hallmark.
      </p>

      <div className="space-y-6 text-navy/80 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">What is BIS Hallmark?</h2>
          <p>
            The BIS hallmark is the certifying mark issued by the Bureau of Indian Standards under the Hallmark
            Marking Scheme. It is your assurance that the precious metal in a piece of jewelry meets the
            declared purity (caratage / fineness).
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">What does the hallmark show?</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>The BIS Standard Mark (a triangle with "BIS")</li>
            <li>Purity grade -- 22K916 / 18K750 / 14K585 for gold</li>
            <li>The 6-digit unique HUID (Hallmark Unique ID), traceable on the BIS portal</li>
            <li>The jeweler's identification mark</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">Verify your piece</h2>
          <p>
            Every CaratFlow invoice prints the HUID printed on the piece. You can verify it independently at{" "}
            <a href="https://bis.gov.in/" className="text-gold" rel="noopener noreferrer" target="_blank">
              bis.gov.in
            </a>{" "}
            or via the BIS CARE app.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">If purity is below standard</h2>
          <p>
            In the unlikely event a CaratFlow piece tests below its declared purity, we will refund twice the
            difference in addition to a full refund of the piece. This commitment is backed by our public
            insurance policy.
          </p>
        </section>
      </div>
    </div>
  );
}
