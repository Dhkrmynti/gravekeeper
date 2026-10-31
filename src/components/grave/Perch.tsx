import { ScrollText } from 'lucide-react';
import type { FlywheelState, MachineConfig } from '../../types';

interface PerchProps {
  state: FlywheelState;
  config: MachineConfig;
  live: boolean;
  onOpenLog: () => void;
}

const PHASE: Record<string, string> = {
  accumulate: 'waiting on the hourglass',
  claim: 'claiming the escrow',
  buyback: 'buying $GRAVE',
  burn: 'laying it in the plot',
  keep: 'making the offering',
};

/** Morrow's perch: what the bot is doing right now, read from the engine. */
export function Perch({ state, config, live, onOpenLog }: PerchProps) {
  const running = state.isWheelSpinning;
  const doing = !live ? 'asleep until the contract address is set' : running ? PHASE[state.currentPhase] ?? 'working' : 'watching the hourglass';
  const rows = [
    { k: 'runs done', v: String(state.cycleCount || 0) },
    { k: 'next run', v: state.nextCycleType === 'keep' ? 'offering · 0.02 ETH' : 'burial · 0.01 ETH' },
    { k: 'buys on', v: state.swapRouter === 'uniswap' || state.isTokenMigrated ? 'Uniswap v4' : 'Pons curve' },
    { k: 'ETH claimed', v: `${(state.totalFeesClaimedETH || 0).toFixed(4)} ETH` },
    { k: 'ETH offered', v: `${(state.totalFeesRetainedETH || 0).toFixed(4)} ETH` },
    { k: 'the plot', v: `${config.deadAddress.slice(0, 6)}…${config.deadAddress.slice(-4)}` },
  ];

  return (
    <section id="morrow" aria-labelledby="morrow-title" className="relative px-4 py-24 sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
        <div>
          <p className="m-0 label text-lantern">the bot</p>
          <h2 id="morrow-title" className="m-0 mt-3 display text-[clamp(2.8rem,6vw,5.2rem)] text-bone">
            Morrow keeps the yard
          </h2>
          <p className="m-0 mt-5 max-w-[46ch] text-[1.08rem] leading-relaxed text-bone-dim">
            Morrow is the bot: a crow that never leaves the yard. It checks the fee escrow around the clock, claims it when the hourglass runs through, and holds the service on its own. Every move it makes lands on chain.
          </p>
        </div>

        <div className="slab px-6 py-8 sm:px-12 sm:py-10">
          {/* the crow's eye, wide when it works */}
          <svg viewBox="0 0 120 40" className="mx-auto block h-10 w-32" aria-hidden="true">
            <path d="M10 26 Q34 4 74 12 L112 22 L74 30 Q40 40 10 26 Z" fill="#050809" />
            <circle cx="62" cy="20" r={running ? 7 : 4.5} fill={live ? '#e8a33d' : '#2b3d44'} style={{ transition: 'r 0.4s' }} />
            <circle cx="62" cy="20" r="2" fill="#050809" />
          </svg>
          <div className="mt-5 text-center">
            <div className="label text-bone-dim">right now</div>
            <div className={`mt-1 display text-[clamp(1.7rem,2.6vw,2.3rem)] ${running ? 'text-lantern' : 'text-bone'}`} aria-live="polite">
              {doing}
            </div>
            {state.lastActionText ? <div className="mx-auto mt-1 max-w-[40ch] truncate font-mono text-[0.78rem] text-bone-dim">{state.lastActionText}</div> : null}
          </div>
          <dl className="m-0 mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-panel-line pt-6 sm:grid-cols-3">
            {rows.map((r) => (
              <div key={r.k}>
                <dt className="label text-[0.64rem] text-bone-dim">{r.k}</dt>
                <dd className="m-0 mt-1 font-mono text-[0.95rem] tabular text-bone">{r.v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-7 flex justify-center">
            <button type="button" onClick={onOpenLog} className="btn-ghost cursor-pointer px-5 py-2.5 text-[0.76rem]">
              <ScrollText className="h-4 w-4" />
              open the full register
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
