import Button from "./Button";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy pt-32 pb-20 md:pt-40 md:pb-28">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/3 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-block bg-gold/10 border border-gold/20 text-gold text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          Purpose-Built for Jewelers
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
          The Complete Jewelry
          <br />
          <span className="text-gold">ERP Platform</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          From raw metal procurement and manufacturing to retail sales and
          customer management -- CaratFlow handles the full lifecycle of your
          jewelry business.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="primary" size="lg" href="/contact">
            Start Free Trial
          </Button>
          <Button variant="secondary" size="lg" href="/contact" className="border-white/30 text-white hover:bg-white hover:text-navy">
            Book a Demo
          </Button>
        </div>
      </div>
    </section>
  );
}
