import type { Metadata } from "next";
import SectionHeader from "@/components/SectionHeader";
import Button from "@/components/Button";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about CaratFlow's mission to empower jewelers with technology that understands their craft.",
};

const values = [
  {
    title: "Built for Jewelry",
    description:
      "Every feature, every workflow, every calculation is designed specifically for the jewelry industry. We don't adapt generic software -- we build purpose-fit tools.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
  },
  {
    title: "Data Security",
    description:
      "Your business data is your most valuable asset. We protect it with end-to-end encryption, tenant isolation, comprehensive audit trails, and optional on-premise deployment.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    title: "Simplicity",
    description:
      "Powerful doesn't have to mean complex. We design every screen and workflow to be intuitive, so your team can get productive from day one without weeks of training.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    title: "India-First, Global-Ready",
    description:
      "Born in India with deep understanding of Indian jewelry trade practices -- GST, HUID, girvi, tunch, tola. Yet fully equipped for international trade with multi-currency, export documentation, and global compliance.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
];

const team = [
  { name: "Globussoft Technologies", role: "Engineering & Design", initials: "GT" },
  { name: "Product Team", role: "Jewelry Industry Experts", initials: "PT" },
  { name: "Support Team", role: "Customer Success", initials: "ST" },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-navy via-navy-light to-navy pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Empowering Jewelers with Technology
            <br />
            <span className="text-gold">That Understands Their Craft</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            CaratFlow exists because the jewelry industry deserves software
            built specifically for its unique workflows, not generic ERPs
            with bolt-on adaptations.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <SectionHeader title="Our Story" centered={false} />
          <div className="prose prose-lg text-gray-700 space-y-5">
            <p>
              The jewelry industry is one of the oldest in the world, yet when
              it comes to technology, most jewelers are stuck between two bad
              options: use a generic ERP that doesn&apos;t understand karat-wise
              tracking, karigar management, or HUID compliance -- or patch
              together disconnected tools and spreadsheets.
            </p>
            <p>
              We saw this gap firsthand. Jewelers spending hours on manual metal
              balance reconciliation. Retailers unable to price items in real-time
              because their systems didn&apos;t integrate live metal rates. Manufacturers
              tracking production on paper because no software understood
              9-stage job order workflows with tunch and wastage calculations.
            </p>
            <p>
              CaratFlow was born to solve this. We assembled a team of engineers
              and jewelry industry consultants to build an ERP from scratch --
              one that treats karat purity, making charges, girvi lending, kitty
              schemes, and HUID tracking as first-class features, not afterthoughts.
            </p>
            <p>
              Today, CaratFlow covers the entire jewelry business lifecycle across
              14 integrated modules and 100+ features. From raw metal procurement
              and manufacturing through retail POS and e-commerce -- all in one
              platform, purpose-built for jewelers.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-warm-gray">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeader
            title="Our Values"
            subtitle="The principles that guide every decision we make."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((v) => (
              <div
                key={v.title}
                className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm"
              >
                <div className="w-12 h-12 bg-gold/10 text-gold rounded-lg flex items-center justify-center mb-4">
                  {v.icon}
                </div>
                <h3 className="text-lg font-bold text-navy mb-2">{v.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeader
            title="The Team Behind CaratFlow"
            subtitle="A passionate team of engineers, designers, and jewelry industry experts."
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {team.map((t) => (
              <div key={t.name} className="text-center">
                <div className="w-20 h-20 bg-navy/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-navy font-bold text-xl">{t.initials}</span>
                </div>
                <h3 className="font-bold text-navy">{t.name}</h3>
                <p className="text-gray-500 text-sm">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 bg-warm-gray">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <SectionHeader
            title="Built with Modern Technology"
            subtitle="CaratFlow is built on a battle-tested, enterprise-grade tech stack."
          />
          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              "Next.js 15",
              "React 19",
              "NestJS 11",
              "TypeScript",
              "Prisma ORM",
              "MySQL 8",
              "Redis",
              "tRPC",
              "Tailwind CSS",
              "React Native",
              "Docker",
              "Turborepo",
            ].map((tech) => (
              <span
                key={tech}
                className="bg-white px-4 py-2 rounded-lg text-sm font-medium text-navy border border-gray-200 shadow-sm"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-navy text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-white mb-4">
            Join the CaratFlow Community
          </h2>
          <p className="text-gray-300 mb-8">
            Whether you run a single retail store or a chain of jewelry outlets,
            we&apos;d love to show you how CaratFlow can transform your business.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="primary" size="lg" href="/contact">
              Book a Demo
            </Button>
            <Button
              variant="secondary"
              size="lg"
              href="/features"
              className="border-white/30 text-white hover:bg-white hover:text-navy"
            >
              Explore Features
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
