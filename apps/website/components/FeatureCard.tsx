interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="group bg-white rounded-xl p-6 border border-gray-100 hover:border-gold/30 shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="w-12 h-12 bg-gold/10 text-gold rounded-lg flex items-center justify-center mb-4 group-hover:bg-gold group-hover:text-white transition-colors duration-300">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-navy mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
