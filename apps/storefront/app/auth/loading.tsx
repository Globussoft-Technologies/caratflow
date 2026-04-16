export default function AuthLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-navy/5 rounded-xl mx-auto mb-4 animate-pulse" />
          <div className="h-6 w-40 bg-navy/5 rounded mx-auto animate-pulse" />
          <div className="h-3 w-56 bg-navy/5 rounded mx-auto mt-2 animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 w-full bg-navy/5 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-px bg-gray-200" />
          <div className="space-y-3">
            <div className="h-4 w-20 bg-navy/5 rounded animate-pulse" />
            <div className="h-10 w-full bg-navy/5 rounded-lg animate-pulse" />
            <div className="h-4 w-24 bg-navy/5 rounded animate-pulse" />
            <div className="h-10 w-full bg-navy/5 rounded-lg animate-pulse" />
          </div>
          <div className="h-11 w-full bg-gold/30 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
