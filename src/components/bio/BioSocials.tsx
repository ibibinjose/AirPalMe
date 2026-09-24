import { Facebook, Globe, Instagram, Linkedin, Music2, Twitter, Youtube } from "lucide-react";
import { isSafeBioHref, socialLinks, type BioLink, type BioLinkType } from "@shared/bio";
import { cn } from "@/lib/cn";

const ICONS: Partial<Record<BioLinkType, typeof Instagram>> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  x: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  website: Globe,
};

const BRAND_STYLES: Partial<Record<BioLinkType, { color: string; hover: string }>> = {
  instagram: { color: "text-pink-600", hover: "hover:border-pink-500/40 hover:bg-pink-500/5" },
  tiktok: { color: "text-ink", hover: "hover:border-ink/40 hover:bg-black/5" },
  youtube: { color: "text-red-600", hover: "hover:border-red-500/40 hover:bg-red-500/5" },
  linkedin: { color: "text-blue-600", hover: "hover:border-blue-500/40 hover:bg-blue-500/5" },
  facebook: { color: "text-blue-700", hover: "hover:border-blue-600/40 hover:bg-blue-600/5" },
  x: { color: "text-ink", hover: "hover:border-ink/40 hover:bg-black/5" },
};

export function BioSocials({
  links,
  onTap,
  className,
}: {
  links: BioLink[];
  onTap: (kind: string) => void;
  className?: string;
}) {
  const rows = socialLinks(links).filter((link) => isSafeBioHref(link.href));
  if (!rows.length) return null;

  return (
    <div className={cn("mt-4 flex flex-wrap items-center justify-center gap-2", className)}>
      {rows.map((link) => {
        const Icon = ICONS[link.type] || Globe;
        const brandStyle = BRAND_STYLES[link.type];
        return (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            onClick={() => onTap(link.type)}
            aria-label={link.label || link.type}
            className={cn(
              "group inline-flex h-10 items-center gap-2 rounded-full bg-card px-3.5 text-xs font-semibold text-ink shadow-xs ring-1 ring-line/80 transition-all duration-200 active:scale-95",
              brandStyle?.hover || "hover:border-brand/40 hover:bg-brand/5",
            )}
          >
            <Icon size={15} className={cn("shrink-0 transition-transform group-hover:scale-110", brandStyle?.color)} />
            <span className="capitalize">{link.label || link.type}</span>
          </a>
        );
      })}
    </div>
  );
}

