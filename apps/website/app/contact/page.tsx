import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import SectionHeader from "@/components/SectionHeader";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the CaratFlow team. Book a demo, ask a question, or request a custom quote for your jewelry business.",
};

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-navy via-navy-light to-navy pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Let&apos;s Talk About <span className="text-gold">Your Business</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Whether you want a live demo, have a question about features, or
            need a custom quote -- our team is here to help.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-warm-gray">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Form */}
            <div className="lg:col-span-3">
              <h2 className="text-2xl font-bold text-navy mb-6">
                Send Us a Message
              </h2>
              <ContactForm />
            </div>

            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-navy mb-6">
                  Get in Touch
                </h2>

                {/* Office */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gold/10 text-gold rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy mb-1">
                        Head Office -- Mumbai
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        Globussoft Technologies
                        <br />
                        Andheri East, Mumbai 400069
                        <br />
                        Maharashtra, India
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gold/10 text-gold rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy mb-1">Phone</h3>
                      <p className="text-gray-600 text-sm">
                        +91 22 4000 1234
                        <br />
                        Mon - Sat, 9:00 AM - 7:00 PM IST
                      </p>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gold/10 text-gold rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy mb-1">Email</h3>
                      <p className="text-gray-600 text-sm">
                        sales@caratflow.com
                        <br />
                        support@caratflow.com
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Book a Demo CTA */}
              <div className="bg-navy rounded-xl p-6 text-center">
                <h3 className="text-white font-bold text-lg mb-2">
                  Prefer a Live Demo?
                </h3>
                <p className="text-gray-300 text-sm mb-4">
                  See CaratFlow in action with a personalized walkthrough
                  tailored to your business.
                </p>
                <a
                  href="mailto:sales@caratflow.com?subject=Demo%20Request"
                  className="inline-flex items-center justify-center bg-gold text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-gold-dark transition-colors text-sm"
                >
                  Book a Demo
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
