interface HourglassProps {
  escrow: number;
  threshold: number;
  fill: number;
  nextCycle: 'burn' | 'keep';
  live: boolean;
  running: boolean;
}

/**
 * The fee escrow as an hourglass. Every trade adds a grain to the top bulb; when it is full,
 * Morrow turns it and a run starts (burial or offering).
 */
export function Hourglass({ escrow, threshold, fill, nextCycle, live, running }: HourglassProps) {
  const trick = nextCycle === 'burn';
  const pct = Math.round(fill * 100);
  // sand gathers in the lower bulb: y 62..108 of the drawing
  const level = 108 - 46 * fill;
  const liquid = trick ? '#8fe6d2' : '#e58f7b';
  const status = !live
    ? 'waiting for the contract address'
    : running
      ? trick
        ? 'a burial is under way'
        : 'an offering is under way'
      : fill >= 0.85
        ? 'nearly run through'
        : 'every trade adds a grain';

  return (
    <div className="slab flex items-stretch gap-5 p-5 sm:p-6">
      <svg viewBox="0 0 80 120" className="h-36 w-24 shrink-0" role="meter" aria-label="Fee escrow toward the next run" aria-valuemin={0} aria-valuemax={threshold || 1} aria-valuenow={escrow}>
        <defs>
          <clipPath id="glass-clip">
            <path d="M16 10 H64 V26 Q64 44 44 60 Q64 76 64 94 V110 H16 V94 Q16 76 36 60 Q16 44 16 26 Z" />
          </clipPath>
        </defs>
        <g clipPath="url(#glass-clip)">
          <rect width="80" height="120" fill="#0d1619" />
          <g style={{ transform: `translateY(${level}px)`, transition: 'transform 1.2s cubic-bezier(0.16,1,0.3,1)' }}>
            <rect width="80" height="120" fill={liquid} />
          </g>
          {live && fill < 1 ? <path className="sand" d="M40 60 V112" stroke={liquid} strokeWidth="1.6" strokeDasharray="2 6" /> : null}
        </g>
        <path d="M16 10 H64 V26 Q64 44 44 60 Q64 76 64 94 V110 H16 V94 Q16 76 36 60 Q16 44 16 26 Z" fill="none" stroke="#93a6a8" strokeWidth="2.2" strokeLinejoin="round" />
        <rect x="8" y="4" width="64" height="7" rx="2" fill="#4d5c5e" />
        <rect x="8" y="109" width="64" height="7" rx="2" fill="#4d5c5e" />
      </svg>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-3">
          <span className="label text-bone-dim">fee escrow</span>
          <span className={`tabular font-mono text-[0.85rem] ${trick ? 'text-wisp' : 'text-offer'}`}>{pct}%</span>
        </div>
        <div className="mt-1 tabular font-mono text-[1.35rem] text-bone">
          {escrow.toFixed(4)} <span className="text-[0.9rem] text-bone-dim">/ {threshold ? threshold.toFixed(2) : '—'} ETH</span>
        </div>
        <p className={`m-0 mt-2 flex items-center gap-2 text-[0.9rem] ${running ? 'text-lantern-hot' : 'text-bone-dim'}`} aria-live="polite">
          <span className={`h-2 w-2 shrink-0 rounded-full ${!live ? 'bg-panel-line' : running ? 'bg-lantern shadow-[0_0_10px_2px_rgba(232,163,61,0.6)]' : 'bg-wisp shadow-[0_0_8px_1px_rgba(143,230,210,0.5)]'}`} />
          {status}
        </p>
        <div className="mt-auto border-t border-panel-line pt-3 max-sm:mt-3">
          <span className="label text-bone-dim">next run</span>
          <p className="m-0 mt-1 text-[0.98rem] leading-snug text-bone">
            {trick ? (
              <>
                <b className="font-semibold text-wisp">Burial:</b> buy $GRAVE and lay it in the plot
              </>
            ) : (
              <>
                <b className="font-semibold text-offer">Offering:</b> the fees go to the project wallet
              </>
            )}
            <span className="block text-[0.82rem] text-bone-dim">{trick ? 'odd runs bury, at 0.01 ETH' : 'even runs keep, at 0.02 ETH'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
