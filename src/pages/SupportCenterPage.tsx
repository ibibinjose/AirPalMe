import { useState, useMemo, type FormEvent } from "react";
import { Link } from "wouter";
import { CheckCircle2, ChevronDown, HelpCircle, LifeBuoy, Mail, Search, Send, ShieldAlert } from "lucide-react";
import { HELP_ARTICLES, HELP_CATEGORIES, type HelpCategoryId } from "@/lib/help-articles";
import { LEGAL } from "@/lib/legal";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

const CONTACT_TOPICS = [
  { id: "ticketing", label: "Event Tickets & Passbook" },
  { id: "plans", label: "Hangouts & Plan Invites" },
  { id: "bio", label: "Digital Bio (@handle) & Circle" },
  { id: "safety", label: "Trust, Safety & Reporting" },
  { id: "business", label: "Merchant & Venue Partner Support" },
  { id: "general", label: "General Feedback or Question" },
] as const;

export function SupportCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | HelpCategoryId>("all");
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  // Contact form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<(typeof CONTACT_TOPICS)[number]["id"]>("ticketing");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return HELP_ARTICLES.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (!q) return true;
      const haystack = `${item.title} ${item.summary} ${item.steps.join(" ")}`.toLowerCase();
      return q.split(/\s+/).every((word) => haystack.includes(word));
    });
  }, [searchQuery, selectedCategory]);

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    void triggerHaptic("medium");
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in your name, email, and message.");
      return;
    }

    const topicLabel = CONTACT_TOPICS.find((t) => t.id === topic)?.label || topic;
    const subject = `[AirPal Support] ${topicLabel} — ${name}`;
    const body = `Name: ${name}\nEmail: ${email}\nTopic: ${topicLabel}\n\nMessage:\n${message}`;

    const mailto = `mailto:${LEGAL.contacts}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;

    void navigator.clipboard?.writeText(`${subject}\n\n${body}`).then(
      () => toast.success("Inquiry drafted! Your email client has been opened."),
      () => toast.message("Please send via your mail client."),
    );

    setSubmitted(true);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32 md:px-6">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3.5 py-1 text-xs font-bold text-brand ring-1 ring-brand/20">
          <LifeBuoy size={14} />
          <span>Support Center</span>
        </div>
        <h1 className="font-display mt-3 text-3xl md:text-4xl font-bold tracking-tight text-ink">
          How can we assist you today?
        </h1>
        <p className="mt-2 text-sm text-mute">
          Browse instant solutions to common questions, or submit a support inquiry directly to our team.
        </p>

        {/* Search Input */}
        <div className="relative mt-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs (tickets, refund policy, @handle bio, Apple Wallet)..."
            className="w-full min-h-[50px] rounded-2xl bg-card pl-11 pr-4 text-sm text-ink ring-1 ring-line placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-brand shadow-xs"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => {
            void triggerHaptic("selection");
            setSelectedCategory("all");
          }}
          className={cn(
            "rounded-full px-4 py-2 text-xs font-semibold ring-1 transition cursor-pointer",
            selectedCategory === "all"
              ? "bg-brand text-white ring-brand shadow-xs"
              : "bg-card text-mute ring-line hover:text-ink hover:bg-paper",
          )}
        >
          All Topics
        </button>
        {HELP_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              void triggerHaptic("selection");
              setSelectedCategory(cat.id);
            }}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold ring-1 transition cursor-pointer",
              selectedCategory === cat.id
                ? "bg-brand text-white ring-brand shadow-xs"
                : "bg-card text-mute ring-line hover:text-ink hover:bg-paper",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* FAQs Accordion */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-ink mb-4 flex items-center gap-2">
          <HelpCircle size={18} className="text-accent" />
          <span>Frequently Asked Questions ({filteredFaqs.length})</span>
        </h2>

        {filteredFaqs.length > 0 ? (
          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div key={faq.id} className="overflow-hidden rounded-2xl bg-card ring-1 ring-line shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setOpenFaqId(isOpen ? null : faq.id);
                    }}
                    className="flex min-h-[52px] w-full items-center justify-between px-5 py-4 text-left transition hover:bg-paper cursor-pointer"
                  >
                    <span className="font-display text-sm font-bold text-ink pr-4">{faq.title}</span>
                    <ChevronDown
                      size={18}
                      className={cn("text-mute shrink-0 transition-transform duration-200", isOpen && "rotate-180")}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-line/60 bg-paper/50 px-5 py-4 text-xs leading-relaxed text-ink/80">
                      <p className="font-medium text-ink">{faq.summary}</p>
                      {faq.steps.length > 0 && (
                        <ol className="mt-3 list-decimal pl-4 space-y-1 text-mute">
                          {faq.steps.map((st, i) => (
                            <li key={i}>{st}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-card p-6 text-center text-xs text-mute ring-1 ring-line">
            No matching articles found for &quot;{searchQuery}&quot;. Use the contact form below to reach us!
          </div>
        )}
      </section>

      {/* Contact Form Section */}
      <section className="mt-12 rounded-3xl bg-card p-6 md:p-8 ring-1 ring-line shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line/60 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-bold text-accent">
              <Mail size={13} />
              <span>Reach Out to Our Team</span>
            </div>
            <h2 className="font-display mt-2 text-2xl font-bold text-ink">Submit a Support Ticket</h2>
            <p className="mt-1 text-xs text-mute">
              Have a question about a pass, merchant deal, or account? We usually respond within 24 hours.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/assist"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-rose-500/10 px-4 text-xs font-semibold text-rose-600 ring-1 ring-rose-500/20 hover:bg-rose-500/20 transition"
            >
              <ShieldAlert size={14} />
              <span>Safety &amp; Urgent Reports</span>
            </Link>
          </div>
        </div>

        {submitted ? (
          <div className="py-10 text-center">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
            <h3 className="font-display mt-3 text-lg font-bold text-ink">Thank you, {name}!</h3>
            <p className="mt-1 text-xs text-mute max-w-sm mx-auto">
              Your inquiry has been formatted and passed to our support dispatch desk.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setMessage("");
              }}
              className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition cursor-pointer"
            >
              Submit Another Inquiry
            </button>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="support-name"
                  className="block text-xs font-bold text-mute uppercase tracking-wider mb-1.5"
                >
                  Your Full Name
                </label>
                <input
                  id="support-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maya Chen"
                  className="w-full min-h-[44px] rounded-xl bg-paper px-3.5 text-sm text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label
                  htmlFor="support-email"
                  className="block text-xs font-bold text-mute uppercase tracking-wider mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="support-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. maya@example.com"
                  className="w-full min-h-[44px] rounded-xl bg-paper px-3.5 text-sm text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="support-topic"
                className="block text-xs font-bold text-mute uppercase tracking-wider mb-1.5"
              >
                Support Category
              </label>
              <select
                id="support-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value as (typeof CONTACT_TOPICS)[number]["id"])}
                className="w-full min-h-[44px] rounded-xl bg-paper px-3.5 text-sm font-medium text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {CONTACT_TOPICS.map((top) => (
                  <option key={top.id} value={top.id}>
                    {top.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="support-message"
                className="block text-xs font-bold text-mute uppercase tracking-wider mb-1.5"
              >
                How Can We Help?
              </label>
              <textarea
                id="support-message"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or question in detail (include booking ID or event name if applicable)..."
                className="w-full rounded-xl bg-paper p-3.5 text-sm text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand px-6 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition active:scale-95 cursor-pointer"
              >
                <Send size={14} />
                <span>Submit Support Ticket</span>
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
