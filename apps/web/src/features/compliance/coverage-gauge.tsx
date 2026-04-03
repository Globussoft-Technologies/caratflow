'use client';

interface CoverageGaugeProps {
  percent: number;
  label: string;
  size?: 'sm' | 'md';
}

export function CoverageGauge({ percent, label, size = 'md' }: CoverageGaugeProps) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const radius = size === 'sm' ? 30 : 40;
  const stroke = size === 'sm' ? 6 : 8;
  const svgSize = (radius + stroke) * 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedPercent / 100) * circumference;

  const color = clampedPercent >= 80
    ? 'text-emerald-500'
    : clampedPercent >= 50
      ? 'text-amber-500'
      : 'text-red-500';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg className="rotate-[-90deg]" width={svgSize} height={svgSize}>
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted"
          />
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${size === 'sm' ? 'text-sm' : 'text-lg'}`}>
            {clampedPercent.toFixed(0)}%
          </span>
        </div>
      </div>
      <span className={`text-muted-foreground ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
        {label}
      </span>
    </div>
  );
}
