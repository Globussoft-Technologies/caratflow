import Button from "./Button";

interface PricingCardProps {
  name: string;
  description: string;
  priceINR: string;
  priceUSD: string;
  features: string[];
  popular?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
}

export default function PricingCard({
  name,
  description,
  priceINR,
  priceUSD,
  features,
  popular = false,
  ctaLabel = "Get Started",
  ctaHref = "/contact",
}: PricingCardProps) {
  return (
    <div
      className={`relative rounded-2xl p-8 flex flex-col ${
        popular
          ? "bg-navy text-white shadow-2xl scale-[1.03] border-2 border-gold"
          : "bg-white text-navy border border-gray-200 shadow-sm"
      }`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
          Most Popular
        </div>
      )}
      <h3 className="text-xl font-bold mb-1">{name}</h3>
      <p className={`text-sm mb-6 ${popular ? "text-gray-300" : "text-gray-500"}`}>
        {description}
      </p>
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">{priceINR}</span>
          {priceINR !== "Custom" && (
            <span className={`text-sm ${popular ? "text-gray-300" : "text-gray-500"}`}>
              /month
            </span>
          )}
        </div>
        {priceUSD && (
          <div className={`text-xs mt-1 ${popular ? "text-gray-400" : "text-gray-400"}`}>
            {priceUSD}
          </div>
        )}
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <svg
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                popular ? "text-gold-light" : "text-gold"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        variant={popular ? "primary" : "secondary"}
        href={ctaHref}
        className="w-full"
      >
        {ctaLabel}
      </Button>
    </div>
  );
}
