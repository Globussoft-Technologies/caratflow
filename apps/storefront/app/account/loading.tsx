export default function AccountLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-navy/5 rounded animate-pulse" />
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
        <div className="h-4 w-32 bg-navy/5 rounded animate-pulse" />
        <div className="h-4 w-full bg-navy/5 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-navy/5 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-2">
            <div className="h-4 w-24 bg-navy/5 rounded animate-pulse" />
            <div className="h-4 w-full bg-navy/5 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-navy/5 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
