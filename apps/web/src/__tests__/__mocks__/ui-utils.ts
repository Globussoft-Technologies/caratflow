export function cn(...args: unknown[]) {
  return args.filter(Boolean).join(' ');
}
