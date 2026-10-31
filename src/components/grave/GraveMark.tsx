/** The mark: a headstone with a crow on it, drawn so it stays sharp at favicon size. */
export function GraveMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <circle cx="32" cy="32" r="32" fill="#141f24" />
      <path d="M17 54 V30 Q17 15 32 15 Q47 15 47 30 V54 Z" fill="#a9afa5" />
      <path d="M32 26 V44 M25 32 H39" stroke="#172024" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M27 16 Q28 7 35 7 Q38 7 40 9 L46 10 L40 12 Q39 16 37 17 L32 16 L24 19 Z" fill="#090f12" />
      <circle cx="36" cy="9.6" r="1.1" fill="#e8a33d" />
      <rect x="10" y="53" width="44" height="4" rx="2" fill="#090f12" />
    </svg>
  );
}
