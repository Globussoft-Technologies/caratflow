export const metadata = { title: "Size Guide | CaratFlow" };

const ringSizes = [
  { in: "5", uk: "J", us: "5", mm: 49.3 },
  { in: "8", uk: "L", us: "5.75", mm: 50.8 },
  { in: "10", uk: "M", us: "6", mm: 51.6 },
  { in: "12", uk: "N", us: "6.75", mm: 53.1 },
  { in: "14", uk: "O", us: "7", mm: 54.0 },
  { in: "16", uk: "P", us: "7.5", mm: 55.0 },
  { in: "18", uk: "Q", us: "8", mm: 56.6 },
  { in: "20", uk: "R", us: "8.5", mm: 57.6 },
  { in: "22", uk: "S", us: "9", mm: 58.7 },
];

export default function SizeGuidePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-serif)" }}>
        Size Guide
      </h1>
      <p className="text-navy/60 text-sm mb-8">Find your perfect ring or bangle size.</p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-navy mb-4">Ring Sizes</h2>
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-warm-gray text-xs uppercase text-navy/60">
              <tr>
                <th className="px-4 py-3 text-left">India</th>
                <th className="px-4 py-3 text-left">UK</th>
                <th className="px-4 py-3 text-left">US</th>
                <th className="px-4 py-3 text-left">Inner Diameter (mm)</th>
              </tr>
            </thead>
            <tbody>
              {ringSizes.map((r) => (
                <tr key={r.in} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-navy">{r.in}</td>
                  <td className="px-4 py-3 text-navy/70">{r.uk}</td>
                  <td className="px-4 py-3 text-navy/70">{r.us}</td>
                  <td className="px-4 py-3 text-navy/70">{r.mm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-navy mb-4">How to Measure</h2>
        <ol className="list-decimal pl-5 space-y-2 text-navy/70 text-sm leading-relaxed">
          <li>Wrap a strip of paper or string around the base of your finger.</li>
          <li>Mark the point where the strip overlaps and measure that length in millimeters.</li>
          <li>Match the measurement to the inner-diameter column above.</li>
          <li>If you are between sizes, choose the larger one. Fingers are slightly larger in the evening
            and in warm weather.</li>
        </ol>
        <p className="text-navy/60 text-xs mt-4">
          Need help? <a href="/consultation/request" className="text-gold">Book a video sizing call</a> -- we
          will guide you through it on camera.
        </p>
      </section>
    </div>
  );
}
