export const metadata = { title: "Store Locator | CaratFlow" };

const stores = [
  {
    city: "Mumbai",
    name: "CaratFlow Bandra",
    address: "Linking Road, Bandra West, Mumbai 400050",
    phone: "+91 22 4000 1100",
    hours: "11:00 - 21:00 (closed Tuesday)",
  },
  {
    city: "Delhi NCR",
    name: "CaratFlow South Extension",
    address: "South Extension Part 2, New Delhi 110049",
    phone: "+91 11 4000 1200",
    hours: "11:00 - 21:00 (closed Sunday)",
  },
  {
    city: "Bengaluru",
    name: "CaratFlow Indiranagar",
    address: "100 Feet Road, Indiranagar, Bengaluru 560038",
    phone: "+91 80 4000 1300",
    hours: "11:00 - 21:00 (open all days)",
  },
  {
    city: "Jaipur",
    name: "CaratFlow Flagship Workshop",
    address: "Johari Bazaar, Jaipur 302003",
    phone: "+91 141 400 1400",
    hours: "10:30 - 20:30 (closed Sunday)",
  },
];

export default function StoreLocatorPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-serif)" }}>
        Find a Store Near You
      </h1>
      <p className="text-navy/60 text-sm mb-8">Visit one of our boutiques to see pieces in person.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stores.map((s) => (
          <div key={s.name} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold mb-1">{s.city}</p>
            <h3 className="text-lg font-semibold text-navy mb-2">{s.name}</h3>
            <p className="text-sm text-navy/70 mb-2">{s.address}</p>
            <p className="text-sm text-navy/60">{s.phone}</p>
            <p className="text-xs text-navy/40 mt-2">{s.hours}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-navy/60 mt-8">
        Can't visit in person? <a href="/consultation/request" className="text-gold">Book a video walkthrough</a>{" "}
        and a designer will show you any piece live on camera.
      </p>
    </div>
  );
}
