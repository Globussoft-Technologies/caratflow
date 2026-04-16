export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 flex flex-col items-center justify-center">
      <div className="relative w-14 h-14 mb-5">
        <div className="absolute inset-0 rounded-full border-4 border-gold/20" />
        <div className="absolute inset-0 rounded-full border-4 border-gold border-t-transparent animate-spin" />
      </div>
      <p className="text-navy/60 text-sm">Loading Carat<span className="text-gold font-semibold">Flow</span>...</p>
    </div>
  );
}
