export default function ProductLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-3 w-16 bg-navy/5 rounded animate-pulse" />
        <span className="text-navy/20">/</span>
        <div className="h-3 w-20 bg-navy/5 rounded animate-pulse" />
        <span className="text-navy/20">/</span>
        <div className="h-3 w-24 bg-navy/5 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="aspect-square bg-navy/5 rounded-xl animate-pulse" />
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-square bg-navy/5 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <div className="h-8 w-3/4 bg-navy/5 rounded animate-pulse mb-2" />
            <div className="h-4 w-1/3 bg-navy/5 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-32 bg-navy/5 rounded animate-pulse" />
            <div className="h-5 w-20 bg-navy/5 rounded animate-pulse" />
          </div>
          <div className="h-px w-full bg-gray-100" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-navy/5 rounded animate-pulse" />
            <div className="h-4 w-full bg-navy/5 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-navy/5 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-navy/5 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="flex gap-3">
            <div className="h-12 flex-1 bg-gold/20 rounded-lg animate-pulse" />
            <div className="h-12 w-12 bg-navy/5 rounded-lg animate-pulse" />
          </div>
          <div className="relative flex items-center justify-center py-4">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-4 border-gold/20" />
              <div className="absolute inset-0 rounded-full border-4 border-gold border-t-transparent animate-spin" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
