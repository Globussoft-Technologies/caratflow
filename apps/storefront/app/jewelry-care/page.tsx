export const metadata = { title: "Jewelry Care | CaratFlow" };

export default function JewelryCarePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-serif)" }}>
        Caring for Your Jewelry
      </h1>
      <p className="text-navy/60 text-sm mb-8">A few simple habits keep your pieces looking new.</p>

      <div className="space-y-6 text-navy/80 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">Daily Wear</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Put your jewelry on after perfume, deodorant, and makeup -- not before.</li>
            <li>Remove rings before workouts, dishwashing, and gardening.</li>
            <li>Take it off before swimming -- chlorine and salt water tarnish gold and silver.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">Cleaning at Home</h2>
          <p>
            Mix a few drops of mild dish soap into warm water. Soak your piece for 10 minutes, brush gently
            with a soft toothbrush, rinse, and pat dry with a lint-free cloth. Avoid ultrasonic cleaners on
            emeralds, opals, pearls, or fracture-filled stones.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">Storage</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Store each piece in its own pouch -- diamonds scratch gold.</li>
            <li>Silver tarnishes in humid air. Keep it in a zip-lock bag with an anti-tarnish strip.</li>
            <li>Pearls love being worn. If you store them, lay them flat -- not hanging.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">Lifetime Service</h2>
          <p>
            Bring or ship any CaratFlow piece back to us once a year for a free polish, prong-tightening,
            and ultrasonic cleaning. If you bought through the storefront just request it from your account.
          </p>
        </section>
      </div>
    </div>
  );
}
