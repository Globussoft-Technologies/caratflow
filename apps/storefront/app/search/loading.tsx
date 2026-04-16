export default function SearchLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="h-10 w-full bg-navy/5 rounded-lg mb-6 animate-pulse" />
      <div className="flex items-center justify-between mb-6">
        <div className="h-4 w-40 bg-navy/5 rounded animate-pulse" />
        <div className="h-8 w-32 bg-navy/5 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
            <div className="aspect-square bg-navy/5" />
            <div className="p-3 space-y-2">
              <div className="h-3 w-3/4 bg-navy/5 rounded" />
              <div className="h-3 w-1/2 bg-navy/5 rounded" />
              <div className="h-4 w-2/3 bg-navy/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
