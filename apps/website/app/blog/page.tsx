import type { Metadata } from "next";
import SectionHeader from "@/components/SectionHeader";
import Button from "@/components/Button";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights, guides, and best practices for running a modern jewelry business. From HUID compliance to choosing the right ERP.",
};

const posts = [
  {
    title: "Why Generic ERPs Fail Jewelers",
    excerpt:
      "Most ERP systems are built for general manufacturing or retail. They don't understand karat-wise tracking, tunch calculations, or karigar metal balances. Here's why jewelry businesses need purpose-built software and what to look for when evaluating options.",
    date: "March 15, 2026",
    readTime: "8 min read",
    category: "Industry Insights",
  },
  {
    title: "HUID Compliance Guide for Indian Jewelers",
    excerpt:
      "Hallmark Unique Identification (HUID) is now mandatory for gold jewelry sales in India. This comprehensive guide covers the BIS hallmarking process, HUID assignment workflow, record-keeping requirements, and how technology can automate compliance.",
    date: "February 28, 2026",
    readTime: "12 min read",
    category: "Compliance",
  },
  {
    title: "How to Choose the Right Jewelry ERP",
    excerpt:
      "With dozens of ERP options on the market, choosing the right one for your jewelry business can feel overwhelming. We break down the 10 essential features every jewelry ERP should have -- from live metal rate integration to karigar management and GST compliance.",
    date: "February 10, 2026",
    readTime: "10 min read",
    category: "Buying Guide",
  },
];

export default function BlogPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-navy via-navy-light to-navy pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            The CaratFlow <span className="text-gold">Blog</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Insights, guides, and best practices for running a modern jewelry
            business.
          </p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-20 bg-warm-gray">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="space-y-8">
            {posts.map((post) => (
              <article
                key={post.title}
                className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-gold uppercase tracking-wide bg-gold/10 px-3 py-1 rounded-full">
                    {post.category}
                  </span>
                  <span className="text-xs text-gray-400">{post.date}</span>
                  <span className="text-xs text-gray-400">{post.readTime}</span>
                </div>
                <h2 className="text-xl font-bold text-navy mb-3 group-hover:text-gold transition-colors">
                  {post.title}
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  {post.excerpt}
                </p>
                <span className="text-gold font-semibold text-sm inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  Read Article
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <SectionHeader
            title="Stay in the Loop"
            subtitle="Get the latest jewelry industry insights, product updates, and compliance guides delivered to your inbox."
          />
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold text-sm"
            />
            <Button variant="primary" className="w-full sm:w-auto whitespace-nowrap">
              Subscribe
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </section>
    </>
  );
}
