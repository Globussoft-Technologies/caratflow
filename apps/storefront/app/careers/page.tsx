export const metadata = { title: "Careers | CaratFlow" };

export default function CareersPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-serif)" }}>
        Build Heirlooms with Us
      </h1>
      <p className="text-navy/60 text-sm mb-8">
        We are growing our design, retail, and engineering teams. Send us a note and we will keep you in mind.
      </p>

      <div className="space-y-5 text-navy/80 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">Open Roles</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Senior Bench Jeweler -- Jaipur Workshop</li>
            <li>CAD Designer (Rhino + Matrix) -- Jaipur</li>
            <li>Retail Consultant -- Bandra & Indiranagar boutiques</li>
            <li>Customer Experience Lead -- Remote (India)</li>
            <li>Senior Full-stack Engineer (Next.js / NestJS) -- Remote (India)</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">How to apply</h2>
          <p>
            Email your CV and a short note to{" "}
            <a href="mailto:careers@caratflow.com" className="text-gold">careers@caratflow.com</a>. Tell us
            what you would build or design here, and link to anything you are proud of.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">Our Promise</h2>
          <p>
            Honest hours, transparent pay, learning budget, lifetime jewelry-care benefit on your CaratFlow
            purchases, and a small, focused team.
          </p>
        </section>
      </div>
    </div>
  );
}
