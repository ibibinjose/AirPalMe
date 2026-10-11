/**
 * AirPal Pal — original brand mascot.
 * A fluffy bone-cream creature in AirPal-blue headphones, holding the
 * AirPal roundel. Hand-drawn SVG (no stock, no third-party character).
 */
export function AirPalMascot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 264" className={className} role="img" aria-label="AirPal Pal mascot celebrating with music">
      {/* music notes */}
      <g fill="#1b4332">
        <text x="18" y="52" fontSize="26" fontWeight="bold" transform="rotate(-12 30 44)">
          ♪
        </text>
        <text x="196" y="46" fontSize="22" fontWeight="bold" transform="rotate(10 206 38)">
          ♫
        </text>
      </g>
      <g fill="#f43f5e">
        <text x="204" y="84" fontSize="20" fontWeight="bold" transform="rotate(14 212 78)">
          ♪
        </text>
      </g>

      {/* feet */}
      <ellipse cx="88" cy="248" rx="22" ry="13" fill="#e9e0d0" />
      <ellipse cx="152" cy="248" rx="22" ry="13" fill="#e9e0d0" />

      {/* fluff halo (darker bone bumps) */}
      <g fill="#e9e0d0">
        <circle cx="52" cy="120" r="16" />
        <circle cx="44" cy="152" r="18" />
        <circle cx="50" cy="186" r="17" />
        <circle cx="66" cy="216" r="16" />
        <circle cx="188" cy="120" r="16" />
        <circle cx="196" cy="152" r="18" />
        <circle cx="190" cy="186" r="17" />
        <circle cx="174" cy="216" r="16" />
        <circle cx="120" cy="52" r="17" />
        <circle cx="86" cy="58" r="14" />
        <circle cx="154" cy="58" r="14" />
      </g>

      {/* body */}
      <ellipse cx="120" cy="156" rx="72" ry="88" fill="#f5f0e6" />

      {/* headphones: band + cups in AirPal blue */}
      <path
        d="M48 118 C48 58 80 34 120 34 C160 34 192 58 192 118"
        fill="none"
        stroke="#1805db"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <rect x="34" y="102" width="26" height="52" rx="13" fill="#1805db" />
      <rect x="180" y="102" width="26" height="52" rx="13" fill="#1805db" />
      <rect x="40" y="110" width="14" height="36" rx="7" fill="#0e0394" />
      <rect x="186" y="110" width="14" height="36" rx="7" fill="#0e0394" />

      {/* face */}
      <ellipse cx="120" cy="128" rx="46" ry="42" fill="#fff8ec" />
      <circle cx="102" cy="124" r="7" fill="#4a3728" />
      <circle cx="138" cy="124" r="7" fill="#4a3728" />
      <circle cx="104.5" cy="121.5" r="2.2" fill="#ffffff" />
      <circle cx="140.5" cy="121.5" r="2.2" fill="#ffffff" />
      <path d="M112 140 Q120 146 128 140" fill="none" stroke="#4a3728" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="90" cy="136" rx="8" ry="5.5" fill="#ffc2d1" />
      <ellipse cx="150" cy="136" rx="8" ry="5.5" fill="#ffc2d1" />

      {/* belly roundel */}
      <circle cx="120" cy="202" r="34" fill="#1805db" />
      <text
        x="120"
        y="216"
        textAnchor="middle"
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', system-ui, sans-serif"
        fontWeight="800"
        fontSize="40"
        fill="#ffffff"
      >
        A
      </text>

      {/* arms hugging the roundel */}
      <ellipse cx="82" cy="202" rx="13" ry="18" fill="#f5f0e6" transform="rotate(-18 82 202)" />
      <ellipse cx="158" cy="202" rx="13" ry="18" fill="#f5f0e6" transform="rotate(18 158 202)" />
    </svg>
  );
}
