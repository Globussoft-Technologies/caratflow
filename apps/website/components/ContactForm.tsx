"use client";

import { useState } from "react";
import Button from "./Button";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-navy mb-2">Thank You!</h3>
        <p className="text-gray-600">
          We&apos;ve received your message and will get back to you within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-8 border border-gray-200 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Full Name *</label>
          <input
            type="text"
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold text-sm"
            placeholder="Rajesh Kumar"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Email Address *</label>
          <input
            type="email"
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold text-sm"
            placeholder="rajesh@example.com"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Phone Number</label>
          <input
            type="tel"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold text-sm"
            placeholder="+91 98765 43210"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Company Name</label>
          <input
            type="text"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold text-sm"
            placeholder="Your Jewelry Business"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-navy mb-1.5">Number of Locations</label>
        <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold text-sm bg-white">
          <option value="">Select...</option>
          <option value="1">1 location</option>
          <option value="2-5">2-5 locations</option>
          <option value="6-10">6-10 locations</option>
          <option value="11-25">11-25 locations</option>
          <option value="25+">25+ locations</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-navy mb-1.5">Message *</label>
        <textarea
          required
          rows={4}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold text-sm resize-none"
          placeholder="Tell us about your business and how we can help..."
        />
      </div>
      <Button type="submit" variant="primary" size="lg" className="w-full">
        Send Message
      </Button>
    </form>
  );
}
