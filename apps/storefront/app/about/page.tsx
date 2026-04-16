export const metadata = {
  title: "About CaratFlow",
  description: "CaratFlow is India's trusted online jewelry house, crafting BIS hallmarked gold, diamond, and gemstone jewelry since 1952.",
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold mb-2">Since 1952</p>
        <h1 className="text-4xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>
          Crafting Heirlooms for Four Generations
        </h1>
      </header>

      <div className="prose prose-navy max-w-none space-y-5 text-navy/80 text-base leading-relaxed">
        <p>
          CaratFlow began as a single workshop in old Jaipur in 1952, where master karigars hand-cut every
          stone and pulled every gold wire by lamplight. Today we operate across India and ship worldwide,
          but the craft remains the same -- one piece, one artisan, one signature.
        </p>
        <p>
          Every gram of metal we sell is BIS hallmarked. Every diamond is IGI or GIA certified. Every order
          is insured in transit and backed by a 15-day return policy.
        </p>
        <h2 className="text-2xl font-semibold text-navy mt-8">Our Promise</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>22K & 18K hallmarked gold, transparent making charges</li>
          <li>IGI / GIA certified natural diamonds</li>
          <li>Buy-back guarantee at the prevailing rate</li>
          <li>Lifetime free polishing and re-plating</li>
          <li>Live consultation with a designer before you commit</li>
        </ul>
        <h2 className="text-2xl font-semibold text-navy mt-8">Sustainability</h2>
        <p>
          We work only with refiners who comply with the OECD Due Diligence Guidance and source diamonds
          covered by the Kimberley Process. Our packaging is FSC-certified and our retail boxes ship
          plastic-free.
        </p>
      </div>
    </div>
  );
}
