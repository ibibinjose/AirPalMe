import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ArrowLeft, Building2, Calendar, ExternalLink, MapPin, Navigation } from "lucide-react";
import { useEvents } from "@/contexts/EventsContext";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

interface VenueRecord {
  id: string;
  name: string;
  precinct: string;
  address: string;
  category: string;
  image: string;
  description: string;
  googleMapsUrl: string;
}

const PARTNER_VENUES: VenueRecord[] = [
  {
    id: "the-argyle",
    name: "The Argyle Sydney",
    precinct: "The Rocks",
    address: "18 Argyle St, The Rocks NSW 2000",
    category: "Historic Courtyard & Live Music",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
    description: "Iconic cobblestone courtyard featuring live bands, cocktail lounges, and festival gatherings.",
    googleMapsUrl: "https://maps.google.com/?q=The+Argyle+Sydney",
  },
  {
    id: "harbour-rocks",
    name: "Harbour Rocks Hotel",
    precinct: "The Rocks",
    address: "34 Harrington St, The Rocks NSW 2000",
    category: "Heritage Boutique & Garden Terrace",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80",
    description:
      "Historic 1887 boutique property housing intimate founder salons, acoustic evenings, and terrace dining.",
    googleMapsUrl: "https://maps.google.com/?q=Harbour+Rocks+Hotel",
  },
  {
    id: "overseas-terminal",
    name: "Overseas Passenger Terminal",
    precinct: "Sydney Harbour",
    address: "Circular Quay W, The Rocks NSW 2000",
    category: "Waterfront Promenade & Galas",
    image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&auto=format&fit=crop&q=80",
    description: "Spectacular harbourfront views facing the Sydney Opera House for major cultural festivals.",
    googleMapsUrl: "https://maps.google.com/?q=Overseas+Passenger+Terminal+Sydney",
  },
  {
    id: "surry-hills-hub",
    name: "Surry Hills Creative Hub",
    precinct: "Surry Hills",
    address: "405 Crown St, Surry Hills NSW 2010",
    category: "Creative Studio & Tech Space",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80",
    description: "Contemporary industrial loft hosting AI hackathons, design workshops, and community pop-ups.",
    googleMapsUrl: "https://maps.google.com/?q=Surry+Hills+Creative+Hub",
  },
  {
    id: "munich-brauhaus",
    name: "Munich Brauhaus",
    precinct: "The Rocks",
    address: "33 Playfair St, The Rocks NSW 2000",
    category: "Bier Hall & Feast Hall",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80",
    description: "Vibrant historic venue hosting group celebrations, beer tastings, and weekend live entertainment.",
    googleMapsUrl: "https://maps.google.com/?q=Munich+Brauhaus+Sydney",
  },
  {
    id: "mca-rooftop",
    name: "MCA Sculpture Terrace & Cafe",
    precinct: "Circular Quay",
    address: "140 George St, The Rocks NSW 2000",
    category: "Museum Rooftop & Cocktail Lounge",
    image: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&auto=format&fit=crop&q=80",
    description: "Rooftop panoramic views of Sydney Harbour with contemporary art installations and evening socials.",
    googleMapsUrl: "https://maps.google.com/?q=Museum+of+Contemporary+Art+Sydney",
  },
];

export function VenueDirectoryPage() {
  const { calendarEvents } = useEvents();
  const [precinctFilter, setPrecinctFilter] = useState<string>("all");

  const precincts = useMemo(() => {
    const list = Array.from(new Set(PARTNER_VENUES.map((v) => v.precinct)));
    return ["all", ...list];
  }, []);

  const filteredVenues = useMemo(() => {
    if (precinctFilter === "all") return PARTNER_VENUES;
    return PARTNER_VENUES.filter((v) => v.precinct === precinctFilter);
  }, [precinctFilter]);

  // Helper to match events to a venue
  const getVenueEvents = (venue: VenueRecord) => {
    return calendarEvents.filter((ev) => {
      const matchVenue = ev.venue && venue.name.toLowerCase().includes(ev.venue.toLowerCase());
      const matchPrecinct = ev.venue && ev.venue.toLowerCase().includes(venue.precinct.toLowerCase());
      return matchVenue || matchPrecinct;
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-32 md:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Link
            href="/events"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute hover:text-ink ring-1 ring-line hover:bg-paper transition"
          >
            <ArrowLeft size={14} />
            <span>Events</span>
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Venues</span>
        </div>

        <Link
          href="/business"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition"
        >
          <Building2 size={14} className="text-accent" />
          <span>List Your Venue</span>
        </Link>
      </div>

      <div className="text-center max-w-xl mx-auto">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-ink">Partner Venue Directory</h1>
        <p className="mt-2 text-sm text-mute">
          Browse verified partner locations across Sydney and check upcoming events and gigs hosted at each spot.
        </p>

        {/* Precinct Filter Pills */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
          {precincts.map((pr) => (
            <button
              key={pr}
              type="button"
              onClick={() => {
                void triggerHaptic("selection");
                setPrecinctFilter(pr);
              }}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition cursor-pointer",
                precinctFilter === pr
                  ? "bg-brand text-white ring-brand shadow-xs"
                  : "bg-card text-mute ring-line hover:text-ink hover:bg-paper",
              )}
            >
              {pr === "all" ? "All Precincts" : pr}
            </button>
          ))}
        </div>
      </div>

      {/* Venue Cards */}
      <div className="mt-10 space-y-6">
        {filteredVenues.map((venue) => {
          const events = getVenueEvents(venue);

          return (
            <div
              key={venue.id}
              className="overflow-hidden rounded-3xl bg-card ring-1 ring-line shadow-xs transition hover:ring-brand/40"
            >
              <div className="flex flex-col md:flex-row">
                <div className="h-56 md:h-auto md:w-80 shrink-0 overflow-hidden bg-paper">
                  <img src={venue.image} alt={venue.name} className="h-full w-full object-cover" />
                </div>

                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold text-accent">
                        {venue.precinct} · {venue.category}
                      </span>

                      <a
                        href={venue.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                      >
                        <Navigation size={12} />
                        <span>Directions</span>
                      </a>
                    </div>

                    <h2 className="font-display mt-2 text-xl font-bold text-ink">{venue.name}</h2>
                    <p className="mt-1 text-xs text-mute flex items-center gap-1">
                      <MapPin size={13} className="shrink-0 text-mute" />
                      <span>{venue.address}</span>
                    </p>
                    <p className="mt-2.5 text-xs leading-relaxed text-ink/80">{venue.description}</p>
                  </div>

                  {/* Upcoming events at this spot */}
                  <div className="mt-6 border-t border-line/60 pt-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                        <Calendar size={13} className="text-accent" />
                        <span>Upcoming Shows &amp; Gatherings ({events.length})</span>
                      </span>
                    </div>

                    {events.length > 0 ? (
                      <div className="space-y-2">
                        {events.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className="flex items-center justify-between rounded-xl bg-paper px-3 py-2 text-xs ring-1 ring-line/60"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-ink truncate block">{ev.title}</span>
                              <span className="text-[11px] text-mute">
                                {ev.date} · {ev.ticketPrice || "Free Entry"}
                              </span>
                            </div>

                            <Link
                              href={`/e/${ev.id}`}
                              className="inline-flex min-h-[32px] items-center gap-1 rounded-full bg-brand px-3 text-[11px] font-semibold text-white shadow-xs hover:bg-brand/90 transition shrink-0"
                            >
                              <span>Get Pass</span>
                              <ExternalLink size={10} />
                            </Link>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl bg-paper/50 px-3 py-2 text-xs text-mute">
                        No scheduled public events today. Inquire directly or check back soon.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
