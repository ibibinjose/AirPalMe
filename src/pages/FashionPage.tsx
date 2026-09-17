import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, BadgeCheck, Filter, Sparkles, Users } from "lucide-react";

interface FashionBrand {
  id: string;
  name: string;
  origin: string;
  category: string;
  heroImage: string;
  description: string;
  activeCampaigns: number;
  featuredItems: { title: string; price: string; action: "rent" | "swap" | "share" }[];
}

const FEATURED_BRANDS: FashionBrand[] = [
  {
    id: "zimmermann",
    name: "Zimmermann",
    origin: "Sydney, Australia",
    category: "Resortwear & Eveningwear",
    heroImage: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
    description: "Sophisticated femininity, clever color combinations, and delicate floral prints from Sydney.",
    activeCampaigns: 4,
    featuredItems: [
      { title: "Luminosity Silk Linen Gown", price: "$120 / 3 days", action: "rent" },
      { title: "Wonderland Floral Midi Dress", price: "$95 / 3 days", action: "rent" },
    ],
  },
  {
    id: "dion-lee",
    name: "Dion Lee",
    origin: "Sydney, Australia",
    category: "Architectural Tailoring",
    heroImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
    description: "Innovative construction and architectural tailoring fused with sensual fluid draping.",
    activeCampaigns: 3,
    featuredItems: [
      { title: "Corset Hook & Eye Blazer", price: "$110 / 3 days", action: "rent" },
      { title: "Sheer Netting Evening Top", price: "$75 / 3 days", action: "rent" },
    ],
  },
  {
    id: "oroton",
    name: "Oroton",
    origin: "Sydney, Australia",
    category: "Luxury Leather & Apparel",
    heroImage: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
    description: "Australia’s oldest luxury fashion house offering modern leather accessories and effortless ready-to-wear.",
    activeCampaigns: 5,
    featuredItems: [
      { title: "Margaux Leather Shoulder Bag", price: "$50 / 3 days", action: "rent" },
      { title: "Botanical Silk Scarf & Set", price: "$45 / 3 days", action: "swap" },
    ],
  },
  {
    id: "aje",
    name: "AJE",
    origin: "Sydney, Australia",
    category: "Sculptural Luxury Wear",
    heroImage: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80",
    description: "Pioneering Australian luxury fashion grounded in raw beauty, tough femininity, and effortless cool.",
    activeCampaigns: 3,
    featuredItems: [
      { title: "Mimosa Cutout Puff Sleeve Dress", price: "$85 / 3 days", action: "rent" },
      { title: "Chateau Canvas Tote", price: "$40 / 3 days", action: "share" },
    ],
  },
  {
    id: "camilla",
    name: "Camilla",
    origin: "Sydney, Australia",
    category: "Statement Print Resortwear",
    heroImage: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80",
    description: "Vibrant bespoke prints, hand-embellished crystals, and iconic silk kaftans born in Bondi Beach.",
    activeCampaigns: 4,
    featuredItems: [
      { title: "Hand-Embellished Silk Kaftan", price: "$90 / 3 days", action: "rent" },
      { title: "Printed Silk Robe & Maxi", price: "$80 / 3 days", action: "rent" },
    ],
  },
  {
    id: "bassike",
    name: "bassike",
    origin: "Avalon Beach, Sydney",
    category: "Sustainable Essentials",
    heroImage: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80",
    description: "High quality, sustainably produced wardrobe essentials with a relaxed Australian aesthetic.",
    activeCampaigns: 2,
    featuredItems: [
      { title: "Organic Cotton Slub Tank & Trouser", price: "$45 / 3 days", action: "swap" },
      { title: "Tailored Linen Blazer Set", price: "$70 / 3 days", action: "rent" },
    ],
  },
];

export function FashionPage() {
  const [, nav] = useLocation();
  const [filter, setFilter] = useState<string>("all");

  const filteredBrands = filter === "all" 
    ? FEATURED_BRANDS 
    : FEATURED_BRANDS.filter(b => b.category.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      {/* Brand Header */}
      <header className="rounded-3xl bg-ink p-6 md:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-950 border border-ink shadow-xs mb-3">
            <Sparkles size={12} />
            <span>AirPal Fashion · Brand Showcase</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold md:text-5xl leading-tight">
            Discover Sydney Fashion Brands
          </h1>
          <p className="mt-2 text-sm text-white/80 leading-relaxed font-medium">
            Explore authentic designer campaigns, rent statement outfits for Sydney events, and pair your look with an AirPal Mate.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => nav("/mate")}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-amber-400 px-4 text-xs font-black text-slate-950 border border-ink hover:bg-amber-300 transition cursor-pointer"
            >
              <Users size={14} />
              <span>Find a Mate to Style With</span>
            </button>
            <button
              type="button"
              onClick={() => nav("/business/onboard?track=fashion")}
              className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-white/20 px-4 text-xs font-bold text-white border border-white/30 backdrop-blur-sm hover:bg-white/30 transition cursor-pointer"
            >
              <BadgeCheck size={14} />
              <span>List Your Brand Shop Account</span>
            </button>
          </div>
        </div>
      </header>

      {/* Category Filter Chips */}
      <div className="mt-6 flex items-center justify-between gap-3 overflow-x-auto pb-2 no-scrollbar">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-mute flex items-center gap-1 uppercase tracking-wider">
            <Filter size={12} /> Brands:
          </span>
          {["all", "resortwear", "tailoring", "luxury", "essentials"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold capitalize transition border ${
                filter === cat
                  ? "bg-amber-400 text-slate-950 border-ink shadow-xs"
                  : "bg-card text-mute border-line hover:text-ink"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Fashion Brands Grid */}
      <section className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredBrands.map((brand) => (
          <div
            key={brand.id}
            className="group flex flex-col justify-between rounded-3xl border border-line bg-card overflow-hidden shadow-xs hover:shadow-md transition"
          >
            <div>
              <div className="relative h-48 w-full overflow-hidden bg-muted">
                <img
                  src={brand.heroImage}
                  alt={brand.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute top-3 right-3 rounded-full bg-slate-950/80 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-amber-400 border border-white/20">
                  {brand.activeCampaigns} Active Drops
                </span>
                <div className="absolute bottom-3 left-3 rounded-xl bg-white/95 px-3 py-1 text-xs font-black text-slate-950 border border-ink shadow-xs">
                  {brand.origin}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-bold text-ink">{brand.name}</h3>
                  <span className="text-xs font-semibold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full">
                    {brand.category}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-mute font-medium">
                  {brand.description}
                </p>

                {/* Brand Drops Preview */}
                <div className="mt-4 pt-3 border-t border-line space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-mute">Featured Brand Drops:</p>
                  {brand.featuredItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-paper border border-line">
                      <span className="font-semibold truncate text-ink">{item.title}</span>
                      <span className="shrink-0 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {item.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 pt-0">
              <button
                type="button"
                onClick={() => nav(`/mate/request?brand=${brand.id}`)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-ink py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <span>Pair with AirPal Experience</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Brand Partner Onboarding Banner */}
      <section className="mt-10 rounded-3xl bg-amber-400 p-6 md:p-8 text-slate-950 border-2 border-ink shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-400 mb-2">
            AirPal Partner Campaign
          </span>
          <h2 className="font-display text-2xl font-extrabold leading-tight">
            Are you a Fashion Brand or Creator?
          </h2>
          <p className="mt-1 text-sm font-semibold max-w-lg">
            List your brand drops, rentals, and exclusive event pairings directly on the AirPal marketplace engine.
          </p>
        </div>
        <button
          type="button"
          onClick={() => nav("/business/onboard?track=fashion")}
          className="shrink-0 h-12 px-6 rounded-2xl bg-slate-950 text-white font-black text-sm border border-ink hover:bg-slate-800 transition cursor-pointer shadow-sm"
        >
          Partner With AirPal →
        </button>
      </section>
    </div>
  );
}
