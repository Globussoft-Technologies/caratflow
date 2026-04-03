'use client';

interface LicenseUtilizationBarProps {
  percent: number;
}

export function LicenseUtilizationBar({ percent }: LicenseUtilizationBarProps) {
  const getColor = (p: number) => {
    if (p >= 90) return 'bg-red-500';
    if (p >= 70) return 'bg-amber-500';
    return 'bg-primary';
  };

  return (
    <div className="space-y-1">
      <div className="w-full bg-muted rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${getColor(percent)}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Utilized</span>
        <span className={`font-medium ${percent >= 90 ? 'text-red-600' : percent >= 70 ? 'text-amber-600' : ''}`}>
          {percent}%
        </span>
      </div>
    </div>
  );
}
