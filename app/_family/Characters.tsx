// Hand-drawn-feel blob characters and money objects for the Family theme.
// All rendered as inline SVG so they tint cleanly and stay crisp at any size.
// Palette is restricted to the brand 4: ember orange, meadow green, sky blue,
// sunburst yellow — plus accent flamingo and violet for variety.

type CharProps = { size?: number; className?: string; style?: React.CSSProperties };

const stroke = "#282624";

export function BlobOrange({ size = 96, className, style }: CharProps) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M30 55c0-22 14-37 32-37s33 14 33 37c0 14-7 23-15 30-9 7-12 16-18 16s-9-9-18-16C36 78 30 69 30 55Z"
            fill="#ff3e00" stroke={stroke} strokeWidth="3" />
      {/* stick legs */}
      <line x1="48" y1="98" x2="42" y2="115" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <line x1="72" y1="98" x2="78" y2="115" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      {/* feet */}
      <circle cx="42" cy="115" r="3" fill={stroke} />
      <circle cx="78" cy="115" r="3" fill={stroke} />
      {/* eyes */}
      <circle cx="50" cy="50" r="4" fill={stroke} />
      <circle cx="70" cy="50" r="4" fill={stroke} />
      {/* smile */}
      <path d="M50 64 Q60 72 70 64" stroke={stroke} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* cheek */}
      <circle cx="44" cy="62" r="3" fill="#ffbb26" opacity="0.7" />
      <circle cx="76" cy="62" r="3" fill="#ffbb26" opacity="0.7" />
    </svg>
  );
}

export function BlobGreen({ size = 96, className, style }: CharProps) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M22 60c0-20 17-38 38-38s38 18 38 38c0 22-19 38-38 38S22 82 22 60Z"
            fill="#00ca48" stroke={stroke} strokeWidth="3" />
      <line x1="40" y1="92" x2="32" y2="112" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <line x1="80" y1="92" x2="88" y2="112" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="112" r="3" fill={stroke} />
      <circle cx="88" cy="112" r="3" fill={stroke} />
      {/* eyes — closed happy */}
      <path d="M44 54 Q50 48 56 54" stroke={stroke} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M64 54 Q70 48 76 54" stroke={stroke} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M48 70 Q60 80 72 70" stroke={stroke} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* tongue */}
      <path d="M56 76 Q60 82 64 76 Z" fill="#ff58ae" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}

export function BlobBlue({ size = 96, className, style }: CharProps) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} style={style} aria-hidden>
      <ellipse cx="60" cy="58" rx="38" ry="40" fill="#0090ff" stroke={stroke} strokeWidth="3" />
      {/* arms */}
      <path d="M22 60 Q12 70 16 82" stroke={stroke} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M98 60 Q108 70 104 82" stroke={stroke} strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="82" r="3" fill={stroke} />
      <circle cx="104" cy="82" r="3" fill={stroke} />
      <line x1="48" y1="96" x2="44" y2="115" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <line x1="72" y1="96" x2="76" y2="115" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      {/* big eyes */}
      <circle cx="48" cy="52" r="6" fill="#fff" stroke={stroke} strokeWidth="2" />
      <circle cx="72" cy="52" r="6" fill="#fff" stroke={stroke} strokeWidth="2" />
      <circle cx="50" cy="54" r="2.5" fill={stroke} />
      <circle cx="74" cy="54" r="2.5" fill={stroke} />
      {/* small mouth */}
      <ellipse cx="60" cy="72" rx="6" ry="4" fill={stroke} />
    </svg>
  );
}

export function BlobYellow({ size = 96, className, style }: CharProps) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M28 50c0-18 14-32 32-32s32 14 32 32-10 30-32 30S28 68 28 50Z"
            fill="#ffbb26" stroke="#d48f00" strokeWidth="3" />
      {/* tuft of hair */}
      <path d="M58 18 Q60 8 64 16" stroke={stroke} strokeWidth="3" fill="none" strokeLinecap="round" />
      <line x1="48" y1="78" x2="42" y2="98" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <line x1="72" y1="78" x2="78" y2="98" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <circle cx="42" cy="98" r="3" fill={stroke} />
      <circle cx="78" cy="98" r="3" fill={stroke} />
      <circle cx="50" cy="44" r="3.5" fill={stroke} />
      <circle cx="70" cy="44" r="3.5" fill={stroke} />
      <path d="M52 58 Q60 64 68 58" stroke={stroke} strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function CoinStack({ size = 80, className, style }: CharProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={style} aria-hidden>
      <ellipse cx="50" cy="74" rx="28" ry="8" fill="#d48f00" />
      <ellipse cx="50" cy="68" rx="28" ry="8" fill="#ffbb26" stroke={stroke} strokeWidth="2.5" />
      <ellipse cx="50" cy="56" rx="28" ry="8" fill="#d48f00" />
      <ellipse cx="50" cy="50" rx="28" ry="8" fill="#ffbb26" stroke={stroke} strokeWidth="2.5" />
      <ellipse cx="50" cy="38" rx="28" ry="8" fill="#d48f00" />
      <ellipse cx="50" cy="32" rx="28" ry="8" fill="#ffbb26" stroke={stroke} strokeWidth="2.5" />
      <text x="50" y="36" textAnchor="middle" fontSize="11" fontWeight="700" fill={stroke}>$</text>
    </svg>
  );
}

export function Star({ size = 60, className, style, color = "#ffbb26" }: CharProps & { color?: string }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M30 4 L37 22 L56 24 L41 36 L46 54 L30 44 L14 54 L19 36 L4 24 L23 22 Z"
            fill={color} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export function Heart({ size = 60, className, style }: CharProps) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M30 50 C8 36 8 18 22 18 c4 0 7 2 8 6 c1-4 4-6 8-6 c14 0 14 18 -8 32 Z"
            fill="#ff2b3a" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldVault({ size = 80, className, style }: CharProps) {
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M40 6 L66 16 V40 c0 18 -12 28 -26 34 -14 -6 -26 -16 -26 -34 V16 Z"
            fill="#0090ff" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="40" cy="36" r="8" fill="#fff" stroke={stroke} strokeWidth="2.5" />
      <rect x="36" y="40" width="8" height="12" rx="2" fill="#fff" stroke={stroke} strokeWidth="2.5" />
    </svg>
  );
}

export function SwordIcon({ size = 70, className, style }: CharProps) {
  return (
    <svg viewBox="0 0 70 70" width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M15 55 L40 30 L55 15 L60 20 L45 35 L20 60 Z" fill="#fff" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="9" y="50" width="15" height="8" rx="2" transform="rotate(-45 16 54)" fill="#ff3e00" stroke={stroke} strokeWidth="2.5" />
    </svg>
  );
}

export function Sparkle({ size = 28, className, style, color = "#ffbb26" }: CharProps & { color?: string }) {
  return (
    <svg viewBox="0 0 28 28" width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M14 0 L16 12 L28 14 L16 16 L14 28 L12 16 L0 14 L12 12 Z" fill={color} />
    </svg>
  );
}
