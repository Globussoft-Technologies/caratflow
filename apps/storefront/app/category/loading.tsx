export default function CategoryLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="h-8 w-56 bg-navy/5 rounded animate-pulse mb-3" />
      <div className="h-4 w-40 bg-navy/5 rounded animate-pulse mb-8" />
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="hidden lg:block w-64 shrink-0 space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
              <div className="h-4 w-24 bg-navy/5 rounded animate-pulse" />
              <div className="h-3 w-full bg-navy/5 rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-navy/5 rounded animate-pulse" />
            </div>
          ))}
        </aside>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="aspect-square bg-navy/5 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-3/4 bg-navy/5 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-navy/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
