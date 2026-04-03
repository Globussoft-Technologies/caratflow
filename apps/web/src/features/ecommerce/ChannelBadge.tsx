'use client';

import { cn } from '@caratflow/ui';

const channelConfig: Record<string, { label: string; letter: string; className: string }> = {
  SHOPIFY: { label: 'Shopify', letter: 'S', className: 'bg-green-100 text-green-800' },
  AMAZON: { label: 'Amazon', letter: 'A', className: 'bg-orange-100 text-orange-800' },
  FLIPKART: { label: 'Flipkart', letter: 'F', className: 'bg-blue-100 text-blue-800' },
  WEBSITE: { label: 'Website', letter: 'W', className: 'bg-purple-100 text-purple-800' },
  INSTAGRAM: { label: 'Instagram', letter: 'I', className: 'bg-pink-100 text-pink-800' },
  CUSTOM: { label: 'Custom', letter: 'C', className: 'bg-gray-100 text-gray-800' },
};

interface ChannelBadgeProps {
  channelType: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ChannelBadge({ channelType, showLabel = true, size = 'sm' }: ChannelBadgeProps) {
  const config = channelConfig[channelType] ?? channelConfig.CUSTOM;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        config.className,
      )}
    >
      <span className="font-bold">{config.letter}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
