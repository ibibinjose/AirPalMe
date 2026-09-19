import { Facebook, Instagram, Linkedin, Music2, Twitter, Youtube } from "lucide-react";
import { isSafeBioHref, socialLinks, type BioLink, type BioLinkType } from "@shared/bio";
import { cn } from "@/lib/cn";

const ICONS: Partial<Record<BioLinkType, typeof Instagram>> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  x: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
};

export function BioSocials({ links, onTap }: { links: BioLink[]; onTap: (kind: string) => void }) {
  const rows = socialLinks(links).filter((link) => isSafeBioHref(link.href));
  if (!rows.length) return null;
  return (
    <ul className="mt-5 flex flex-wrap justify-center gap-2">
      {rows.map((link) => {
        const Icon = ICONS[link.type];
        return (
          <li key={link.id}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => onTap(link.type)}
              aria-label={link.label}
              className={cn(
                "flex h-11 items-center gap-2 rounded-full bg-card px-3.5 text-sm font-medium ring-1 ring-line",
              )}
            >
              {Icon ? <Icon size={16} strokeWidth={1.8} /> : null}
              {link.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
