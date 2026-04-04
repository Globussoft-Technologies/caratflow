interface TestimonialCardProps {
  quote: string;
  name: string;
  company: string;
  role: string;
}

export default function TestimonialCard({
  quote,
  name,
  company,
  role,
}: TestimonialCardProps) {
  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 flex flex-col">
      <div className="text-gold text-3xl mb-4">&ldquo;</div>
      <p className="text-gray-700 leading-relaxed flex-1 mb-6">{quote}</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-sm">
          {name[0]}
        </div>
        <div>
          <div className="font-semibold text-navy text-sm">{name}</div>
          <div className="text-gray-500 text-xs">
            {role}, {company}
          </div>
        </div>
      </div>
    </div>
  );
}
