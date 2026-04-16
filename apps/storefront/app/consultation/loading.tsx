export default function ConsultationLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-8">
        <div className="h-8 w-64 bg-navy/5 rounded mx-auto animate-pulse" />
        <div className="h-3 w-80 bg-navy/5 rounded mx-auto mt-3 animate-pulse" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="h-3 w-24 bg-navy/5 rounded" />
              <div className="h-10 w-full bg-navy/5 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="space-y-2 animate-pulse">
          <div className="h-3 w-32 bg-navy/5 rounded" />
          <div className="h-24 w-full bg-navy/5 rounded-lg" />
        </div>
        <div className="h-11 w-full bg-gold/30 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
