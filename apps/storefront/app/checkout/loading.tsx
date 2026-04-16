export default function CheckoutLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="h-8 w-40 bg-navy/5 rounded mb-6 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4 animate-pulse">
              <div className="h-5 w-48 bg-navy/5 rounded" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((j) => (
                  <div key={j} className="h-10 w-full bg-navy/5 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4 h-fit animate-pulse">
          <div className="h-5 w-32 bg-navy/5 rounded" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-navy/5 rounded" />
            <div className="h-4 w-full bg-navy/5 rounded" />
            <div className="h-4 w-3/4 bg-navy/5 rounded" />
          </div>
          <div className="h-px bg-gray-200" />
          <div className="h-6 w-full bg-navy/5 rounded" />
          <div className="h-11 w-full bg-gold/30 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
