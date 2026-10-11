import {
  AtSign,
  ChevronRight,
  Facebook,
  Ghost,
  Globe,
  Instagram,
  Linkedin,
  Music2,
  Pin,
  Twitter,
  Youtube,
} from "lucide-react";
import { isSafeBioHref, socialLinks, type BioLink } from "@shared/bio";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";

interface PlatformConfig {
  name: string;
  action: string;
  defaultSubtitle: string;
  icon: typeof Instagram;
  iconBg: string;
  iconColor: string;
  hoverBorder: string;
  badgeBg: string;
  badgeText: string;
}

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  instagram: {
    name: "Instagram",
    action: "Follow",
    defaultSubtitle: "Photos, stories & reels",
    icon: Instagram,
    iconBg: "bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] shadow-sm shadow-rose-500/20",
    iconColor: "text-white",
    hoverBorder: "hover:border-rose-400/50 hover:bg-rose-500/[0.02]",
    badgeBg: "bg-rose-500/10",
    badgeText: "text-rose-700",
  },
  tiktok: {
    name: "TikTok",
    action: "Watch",
    defaultSubtitle: "Shorts & trending videos",
    icon: Music2,
    iconBg: "bg-black text-white shadow-sm shadow-black/20 dark:bg-zinc-800",
    iconColor: "text-white",
    hoverBorder: "hover:border-zinc-500/50 hover:bg-black/[0.02]",
    badgeBg: "bg-zinc-500/10",
    badgeText: "text-zinc-800 dark:text-zinc-200",
  },
  youtube: {
    name: "YouTube",
    action: "Subscribe",
    defaultSubtitle: "Videos, shorts & podcasts",
    icon: Youtube,
    iconBg: "bg-[#ff0000] text-white shadow-sm shadow-red-600/20",
    iconColor: "text-white",
    hoverBorder: "hover:border-red-500/50 hover:bg-red-500/[0.02]",
    badgeBg: "bg-red-500/10",
    badgeText: "text-red-700",
  },
  linkedin: {
    name: "LinkedIn",
    action: "Connect",
    defaultSubtitle: "Professional career & articles",
    icon: Linkedin,
    iconBg: "bg-[#0a66c2] text-white shadow-sm shadow-blue-600/20",
    iconColor: "text-white",
    hoverBorder: "hover:border-blue-500/50 hover:bg-blue-500/[0.02]",
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-700",
  },
  x: {
    name: "X (Twitter)",
    action: "Follow",
    defaultSubtitle: "Live thoughts, news & updates",
    icon: Twitter,
    iconBg: "bg-black text-white shadow-sm shadow-black/20 dark:bg-zinc-800",
    iconColor: "text-white",
    hoverBorder: "hover:border-zinc-500/50 hover:bg-black/[0.02]",
    badgeBg: "bg-zinc-500/10",
    badgeText: "text-zinc-800 dark:text-zinc-200",
  },
  facebook: {
    name: "Facebook",
    action: "Follow",
    defaultSubtitle: "Community, posts & events",
    icon: Facebook,
    iconBg: "bg-[#1877f2] text-white shadow-sm shadow-blue-600/20",
    iconColor: "text-white",
    hoverBorder: "hover:border-blue-600/50 hover:bg-blue-600/[0.02]",
    badgeBg: "bg-blue-600/10",
    badgeText: "text-blue-800",
  },
  threads: {
    name: "Threads",
    action: "Follow",
    defaultSubtitle: "Discussions & conversations",
    icon: AtSign,
    iconBg: "bg-black text-white shadow-sm shadow-black/20 dark:bg-zinc-800",
    iconColor: "text-white",
    hoverBorder: "hover:border-zinc-500/50 hover:bg-black/[0.02]",
    badgeBg: "bg-zinc-500/10",
    badgeText: "text-zinc-800 dark:text-zinc-200",
  },
  snapchat: {
    name: "Snapchat",
    action: "Add",
    defaultSubtitle: "Behind the scenes & snaps",
    icon: Ghost,
    iconBg: "bg-[#fffc00] text-black shadow-sm shadow-yellow-400/20",
    iconColor: "text-black",
    hoverBorder: "hover:border-yellow-400/60 hover:bg-yellow-400/[0.03]",
    badgeBg: "bg-yellow-500/15",
    badgeText: "text-yellow-900",
  },
  pinterest: {
    name: "Pinterest",
    action: "Follow",
    defaultSubtitle: "Inspiration boards & ideas",
    icon: Pin,
    iconBg: "bg-[#e60023] text-white shadow-sm shadow-red-600/20",
    iconColor: "text-white",
    hoverBorder: "hover:border-red-600/50 hover:bg-red-600/[0.02]",
    badgeBg: "bg-red-600/10",
    badgeText: "text-red-700",
  },
};

function extractSubtitle(link: BioLink, cfg: PlatformConfig): string {
  if (!link.href) return cfg.defaultSubtitle;
  try {
    const url = new URL(link.href.startsWith("http") ? link.href : `https://${link.href}`);
    const pathname = url.pathname.replace(/^\/+|\/+$/g, "");
    if (pathname && !["channel", "c", "user", "in", "profile", "feed"].includes(pathname.toLowerCase())) {
      const parts = pathname.split("/");
      const last = parts[parts.length - 1];
      if (last && last.length <= 25 && !last.includes("?") && !last.includes("=")) {
        return `@${last.replace(/^@/, "")}`;
      }
    }
  } catch {
    /* fallback */
  }
  return cfg.defaultSubtitle;
}

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
    <div className={cn("space-y-2.5", className)}>
      {rows.map((link) => {
        const cfg = PLATFORM_CONFIGS[link.type] || {
          name: link.label || link.type,
          action: "Open",
          defaultSubtitle: "Official social link",
          icon: Globe,
          iconBg: "bg-brand text-white shadow-sm shadow-brand/20",
          iconColor: "text-white",
          hoverBorder: "hover:border-brand/40 hover:bg-brand/[0.02]",
          badgeBg: "bg-brand/10",
          badgeText: "text-accent",
        };

        const Icon = cfg.icon;
        const title = link.label && link.label.toLowerCase() !== link.type ? link.label : cfg.name;
        const subtitle = extractSubtitle(link, cfg);

        return (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              void triggerHaptic("light");
              onTap(link.type);
            }}
            aria-label={`${title} (${cfg.action})`}
            className={cn(
              "group flex w-full items-center justify-between rounded-2xl sm:rounded-[22px] bg-card p-3.5 sm:p-4 text-left ring-1 ring-line/80 shadow-2xs transition-all duration-200 hover:shadow-xs active:scale-[0.99] touch-manipulation cursor-pointer",
              cfg.hoverBorder,
            )}
          >
            {/* Left: Brand Icon & Platform Info */}
            <div className="flex items-center gap-3.5 min-w-0">
              <span
                className={cn(
                  "grid h-11 w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-xl sm:rounded-2xl transition-transform duration-200 group-hover:scale-105",
                  cfg.iconBg,
                  cfg.iconColor,
                )}
              >
                <Icon size={20} className="sm:w-[22px] sm:h-[22px]" />
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-display text-sm sm:text-[15px] font-bold text-ink truncate group-hover:text-accent transition-colors">
                    {title}
                  </h4>
                  <span
                    className={cn(
                      "hidden xs:inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      cfg.badgeBg,
                      cfg.badgeText,
                    )}
                  >
                    {cfg.action}
                  </span>
                </div>
                <p className="text-xs text-mute truncate mt-0.5">{subtitle}</p>
              </div>
            </div>

            {/* Right: Action Chevron */}
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-paper/80 text-mute transition-all duration-200 group-hover:bg-brand group-hover:text-white group-hover:translate-x-0.5 shadow-2xs">
                <ChevronRight size={15} />
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
}
