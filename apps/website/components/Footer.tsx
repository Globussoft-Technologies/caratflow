const footerLinks = {
  Product: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Mobile Apps", href: "/features#mobile" },
    { label: "Integrations", href: "/features#integrations" },
    { label: "Security", href: "/about#security" },
  ],
  Solutions: [
    { label: "Retail Jewelers", href: "/features" },
    { label: "Manufacturers", href: "/features" },
    { label: "Wholesale & Distribution", href: "/features" },
    { label: "Jewelry Chains", href: "/features" },
    { label: "Export Houses", href: "/features" },
  ],
  Resources: [
    { label: "Blog", href: "/blog" },
    { label: "Help Center", href: "/contact" },
    { label: "API Documentation", href: "/contact" },
    { label: "HUID Compliance Guide", href: "/blog" },
    { label: "Webinars", href: "/contact" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Careers", href: "/about" },
    { label: "Partners", href: "/contact" },
    { label: "Privacy Policy", href: "/about" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.5 5.5L20 9.5l-4 4 1 5.5L12 16.5 6.5 19l1-5.5-4-4 5.5-1L12 3z" />
                </svg>
              </div>
              <span className="text-xl font-bold">
                Carat<span className="text-gold">Flow</span>
              </span>
            </a>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              The complete jewelry ERP platform -- built for jewelers, by design.
            </p>
            {/* Social links */}
            <div className="flex gap-3">
              {["X", "Li", "Fb", "Yt"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400 hover:bg-gold hover:text-white transition-colors"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-sm mb-4 text-white">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-gray-400 text-sm hover:text-gold transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} CaratFlow by Globussoft Technologies. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-gray-500 text-sm hover:text-gold transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-gray-500 text-sm hover:text-gold transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
