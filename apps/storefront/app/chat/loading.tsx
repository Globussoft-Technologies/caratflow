export default function ChatLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-navy/5 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-navy/5 rounded animate-pulse" />
            <div className="h-3 w-20 bg-navy/5 rounded animate-pulse" />
          </div>
        </div>
        <div className="p-4 space-y-4 min-h-[50vh]">
          {[
            { align: "start", w: "w-3/5" },
            { align: "end", w: "w-2/5" },
            { align: "start", w: "w-1/2" },
            { align: "end", w: "w-1/3" },
          ].map((m, i) => (
            <div key={i} className={`flex ${m.align === "end" ? "justify-end" : "justify-start"}`}>
              <div className={`${m.w} h-10 bg-navy/5 rounded-2xl animate-pulse`} />
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 p-3 flex gap-2">
          <div className="flex-1 h-10 bg-navy/5 rounded-lg animate-pulse" />
          <div className="h-10 w-10 bg-gold/30 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
