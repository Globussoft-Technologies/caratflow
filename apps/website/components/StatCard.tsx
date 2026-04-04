interface StatCardProps {
  value: string;
  label: string;
}

export default function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="text-center p-6">
      <div className="text-4xl md:text-5xl font-bold text-gold mb-2">{value}</div>
      <div className="text-gray-600 text-sm font-medium">{label}</div>
    </div>
  );
}
