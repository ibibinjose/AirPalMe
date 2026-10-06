import React, { forwardRef, useRef, useState, useEffect, useCallback } from "react";
import {
  Search,
  X,
  ArrowRight,
  CornerDownLeft,
  TrendingUp,
  MapPin,
  Calendar,
  Sparkles,
  Users,
  Hotel,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";
import {
  useSearchAutocomplete,
  type AutocompleteSuggestion,
} from "@/hooks/useSearchQueryLogger";

export interface SearchBarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  onFullSearch?: (query: string) => void;
  /** Size token optimized for mobile ergonomics (all have >= 44px touch targets on mobile) */
  sizeVariant?: "sm" | "md" | "lg";
  /** Background & visual treatment */
  variant?: "card" | "paper" | "ghost" | "glass";
  /** Whether to show a button/shortcut to perform a full platform-wide search */
  showFullSearchAction?: boolean;
  /** Custom label for full search button */
  fullSearchLabel?: string;
  /** Additional wrapper className */
  containerClassName?: string;
  /** Left icon override or null to hide */
  icon?: React.ReactNode;
  /** Right accessory slot (e.g. keyboard shortcut or filter button) */
  rightSlot?: React.ReactNode;
  /** Whether to enable the autocomplete dropdown suggesting popular queries */
  enableAutocomplete?: boolean;
  /** Filter suggestions by platform vertical category */
  autocompleteCategory?: string;
  /** Callback fired when the user selects a suggestion */
  onSelectSuggestion?: (term: string, category?: string) => void;
}

const SIZE_STYLES = {
  // sm: 44px on mobile (Apple/Android minimum), 40px on desktop
  sm: {
    container: "h-11 sm:h-10 min-h-[44px] sm:min-h-[40px]",
    input: "text-[16px] sm:text-xs pl-10 pr-10",
    iconLeft: "left-3",
    iconSize: 16,
    clearBtn: "h-11 w-11 min-h-[44px] min-w-[44px]",
  },
  // md: 48px on mobile (standard Apple/Android touch search height), 44px on desktop
  md: {
    container: "h-12 sm:h-11 min-h-[48px] sm:min-h-[44px]",
    input: "text-[16px] sm:text-sm pl-11 pr-11",
    iconLeft: "left-3.5 sm:left-4",
    iconSize: 18,
    clearBtn: "h-12 w-12 min-h-[48px] min-w-[48px]",
  },
  // lg: 52px on mobile (prominent hero search), 48px on desktop
  lg: {
    container: "h-13 sm:h-12 min-h-[52px] sm:min-h-[48px]",
    input: "text-[16px] sm:text-[15px] pl-12 pr-12",
    iconLeft: "left-4",
    iconSize: 20,
    clearBtn: "h-13 w-13 min-h-[52px] min-w-[52px]",
  },
};

const VARIANT_STYLES = {
  card: "bg-card text-ink ring-1 ring-line/90 shadow-xs focus-within:ring-2 focus-within:ring-brand/40 focus-within:shadow-[0_4px_16px_-4px_rgba(18,22,20,0.08)]",
  paper: "bg-paper text-ink ring-1 ring-line focus-within:ring-2 focus-within:ring-brand/40 focus-within:bg-card shadow-2xs",
  glass: "bg-card/85 backdrop-blur-md text-ink ring-1 ring-line/80 shadow-xs focus-within:ring-2 focus-within:ring-brand/40 focus-within:bg-card",
  ghost: "bg-transparent text-ink ring-1 ring-transparent focus-within:ring-1 focus-within:ring-line focus-within:bg-paper/50",
};

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const q = query.trim().toLowerCase();
  const index = text.toLowerCase().indexOf(q);
  if (index === -1) return text;
  const before = text.slice(0, index);
  const match = text.slice(index, index + q.length);
  const after = text.slice(index + q.length);
  return (
    <>
      {before}
      <span className="font-bold text-accent">{match}</span>
      {after}
    </>
  );
}

function getCategoryIcon(cat?: string) {
  switch (cat) {
    case "events":
      return <Calendar size={13} className="text-rose-500" />;
    case "people":
      return <Users size={13} className="text-emerald-600" />;
    case "stay":
      return <Hotel size={13} className="text-amber-600" />;
    case "experiences":
      return <Sparkles size={13} className="text-purple-600" />;
    case "places":
    default:
      return <MapPin size={13} className="text-accent" />;
  }
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  {
    value,
    onChange,
    onClear,
    onFullSearch,
    sizeVariant = "md",
    variant = "card",
    showFullSearchAction = false,
    fullSearchLabel = "Full Search",
    containerClassName,
    className,
    placeholder = "Search…",
    icon,
    rightSlot,
    onKeyDown,
    onFocus,
    onBlur,
    disabled,
    enableAutocomplete = true,
    autocompleteCategory,
    onSelectSuggestion,
    ...restProps
  },
  forwardedRef,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = (forwardedRef as React.RefObject<HTMLInputElement>) || internalInputRef;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const { suggestions } = useSearchAutocomplete(value, {
    category: autocompleteCategory,
    limit: 6,
  });

  const currentSize = SIZE_STYLES[sizeVariant] || SIZE_STYLES.md;
  const currentVariant = VARIANT_STYLES[variant] || VARIANT_STYLES.card;

  const handleClear = () => {
    void triggerHaptic("light");
    onChange("");
    onClear?.();
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleFullSearch = (searchQuery = value) => {
    const q = searchQuery.trim();
    if (!q) return;
    void triggerHaptic("medium");
    setIsOpen(false);
    onFullSearch?.(q);
  };

  const handleSelectSuggestion = useCallback(
    (item: AutocompleteSuggestion) => {
      void triggerHaptic("light");
      onChange(item.term);
      setIsOpen(false);
      setHighlightedIndex(-1);
      onSelectSuggestion?.(item.term, item.category);
      if (onFullSearch) {
        onFullSearch(item.term);
      }
    },
    [onChange, onSelectSuggestion, onFullSearch],
  );

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleInternalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (enableAutocomplete && isOpen && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        return;
      }
      if (e.key === "Enter" && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[highlightedIndex]);
        return;
      }
    }

    if (e.key === "Enter" && onFullSearch && value.trim()) {
      e.preventDefault();
      setIsOpen(false);
      handleFullSearch();
    }
    onKeyDown?.(e);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (enableAutocomplete) {
      setIsOpen(true);
    }
    onFocus?.(e);
  };

  const isDropdownVisible = enableAutocomplete && isOpen && suggestions.length > 0;

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full max-w-full box-border group", containerClassName)}
    >
      <div
        className={cn(
          "relative flex w-full items-center rounded-2xl transition-all duration-200",
          currentSize.container,
          currentVariant,
          disabled && "opacity-60 pointer-events-none",
        )}
      >
        {/* Left Search Icon with brand blue focus highlight */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 shrink-0",
            currentSize.iconLeft,
            "text-mute group-focus-within:text-accent",
          )}
          aria-hidden="true"
        >
          {icon !== undefined ? (
            icon
          ) : (
            <Search size={currentSize.iconSize} strokeWidth={2.2} />
          )}
        </div>

        {/* Input Field: iOS zoom-safe text-[16px] on mobile, WebKit decoration suppression */}
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isDropdownVisible}
          aria-haspopup="listbox"
          aria-controls="search-autocomplete-listbox"
          inputMode="search"
          enterKeyHint="search"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (enableAutocomplete && !isOpen) {
              setIsOpen(true);
            }
          }}
          onFocus={handleInputFocus}
          onBlur={onBlur}
          onKeyDown={handleInternalKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          className={cn(
            "h-full w-full bg-transparent font-medium text-ink placeholder:text-mute outline-none border-none transition-colors",
            // Suppress native iOS Safari and Chrome WebKit cancel buttons to prevent double-render
            "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden",
            currentSize.input,
            // Adjust padding when right accessories are present
            value && "pr-12",
            showFullSearchAction && value && "pr-28 sm:pr-32",
            className,
          )}
          {...restProps}
        />

        {/* Right Action Cluster */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 shrink-0">
          {/* Clear Button: >= 44px touch area for iOS & Android accessibility */}
          {value ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className={cn(
                "flex items-center justify-center rounded-full text-mute transition-all hover:text-ink hover:bg-paper/80 active:scale-90 cursor-pointer touch-manipulation",
                currentSize.clearBtn,
              )}
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          ) : null}

          {/* Optional "Full Search" button inside the bar */}
          {showFullSearchAction && value.trim() && onFullSearch ? (
            <button
              type="button"
              onClick={() => handleFullSearch()}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-ink transition active:scale-95 cursor-pointer touch-manipulation mr-1"
              title="Full Search across AirPal (Enter)"
            >
              <span>{fullSearchLabel}</span>
              <CornerDownLeft size={12} strokeWidth={2.5} className="opacity-80" />
            </button>
          ) : null}

          {/* Right Slot (e.g. filter icon or shortcut badge) */}
          {rightSlot && !value ? (
            <div className="mr-2.5 flex items-center">{rightSlot}</div>
          ) : null}
        </div>
      </div>

      {/* Autocomplete Dropdown Listbox */}
      {isDropdownVisible && (
        <div
          id="search-autocomplete-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden rounded-2xl bg-card p-1.5 ring-1 ring-line shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header indicator */}
          <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-mute">
            <span>
              {value.trim() ? "Suggested Searches" : "Trending Searches"}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-accent lowercase font-medium">
              <TrendingUp size={11} />
              <span>from search logs</span>
            </span>
          </div>

          <div className="space-y-0.5 max-h-[280px] overflow-y-auto no-scrollbar py-0.5">
            {suggestions.map((item, idx) => {
              const isSelected = highlightedIndex === idx;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    // Prevent blur so click handler triggers reliably
                    e.preventDefault();
                    handleSelectSuggestion(item);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={cn(
                    "flex w-full min-h-[44px] items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition cursor-pointer touch-manipulation active:scale-[0.99]",
                    isSelected
                      ? "bg-brand/10 text-accent font-semibold"
                      : "text-ink hover:bg-paper",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors",
                        isSelected
                          ? "bg-brand text-white"
                          : "bg-paper text-mute",
                      )}
                    >
                      {item.matchType === "trending" ? (
                        <TrendingUp size={13} />
                      ) : (
                        <Search size={13} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1 truncate">
                      <span className="truncate">
                        {highlightMatch(item.term, value)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {item.category && item.category !== "all" && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-paper px-1.5 py-0.5 text-[10px] font-semibold text-mute uppercase">
                        {getCategoryIcon(item.category)}
                        <span>{item.category}</span>
                      </span>
                    )}
                    <span className="text-[10px] font-semibold text-mute">
                      {item.count} {item.count === 1 ? "search" : "searches"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom Action: Direct Query Search Option */}
          {value.trim() && (
            <div className="border-t border-line/70 pt-1 mt-1">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFullSearch();
                }}
                className="flex w-full min-h-[40px] items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-accent hover:bg-brand/10 transition cursor-pointer"
              >
                <span className="flex items-center gap-2 truncate">
                  <Search size={13} className="text-accent shrink-0" />
                  <span className="truncate">
                    Search all AirPal for &ldquo;{value.trim()}&rdquo;
                  </span>
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold shrink-0">
                  <CornerDownLeft size={12} strokeWidth={2.5} />
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mobile-only "Full Search" quick suggestion below the bar if configured */}
      {showFullSearchAction && value.trim() && onFullSearch && !isOpen ? (
        <div className="mt-1.5 sm:hidden">
          <button
            type="button"
            onClick={() => handleFullSearch()}
            className="flex w-full min-h-[44px] items-center justify-between rounded-xl bg-brand/10 px-3.5 py-2 text-xs font-semibold text-accent ring-1 ring-brand/20 active:scale-[0.98] transition cursor-pointer"
          >
            <span className="flex items-center gap-2 truncate">
              <Search size={14} className="shrink-0 text-accent" />
              <span className="truncate">Full search for &ldquo;{value.trim()}&rdquo;</span>
            </span>
            <span className="flex items-center gap-1 shrink-0 text-[11px] font-bold">
              <span>All AirPal</span>
              <ArrowRight size={13} />
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
});

SearchBar.displayName = "SearchBar";
