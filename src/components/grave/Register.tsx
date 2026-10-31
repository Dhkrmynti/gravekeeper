import { useMemo } from 'react';
import { Check, Copy, ExternalLink, ScrollText } from 'lucide-react';
import type { ActivityLog, BurnLedgerEntry } from '../../types';

interface RegisterProps {
  burnLedger: BurnLedgerEntry[];
  logs: ActivityLog[];
  totalBurned: number;
  tokenSymbol: string;
  deadAddress: string;
  explorerUrl: string;
  copiedDead: boolean;
  onCopyDead: () => void;
  onOpenLog: () => void;
}

const REMARKS = ['at rest.', 'ashes to ashes.', 'no visitors.', 'six feet down.', 'gone quietly.', 'one less out there.', 'morrow nods.', 'the earth settles.'];

const fmt = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.floor(n));
const compact = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1, roundingMode: 'floor' } as Intl.NumberFormatOptions).format(n);
const shortHash = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;
const when = (e: BurnLedgerEntry) => {
  // ledger timestamps from the chain are in seconds
  const ms = e.timestamp && e.timestamp < 1e12 ? e.timestamp * 1000 : e.timestamp;
  const d = ms ? new Date(ms) : null;
  if (!d || Number.isNaN(d.getTime())) return e.timeStr?.split(' (')[0] ?? '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
};
const burned = (e: BurnLedgerEntry) => e.burnedJollyburn || e.burnedMuseburn || e.burnedIncinerator || 0;

interface Offering {
  key: string;
  eth: number;
  time: string;
  tx: string;
}

/** A candle on the page: its height is the drop's size next to the biggest one shown. */
function Candle({ share }: { share: number }) {
  const h = 10 + share * 34;
  return (
    <svg viewBox="0 0 20 56" className="h-14 w-5 shrink-0" aria-hidden="true">
      <path className="flicker" d={`M10 ${50 - h - 12} Q15 ${50 - h - 4} 10 ${50 - h} Q5 ${50 - h - 4} 10 ${50 - h - 12} Z`} fill="#e8a33d" />
      <rect x="9.3" y={50 - h - 2} width="1.4" height="3" fill="#172024" />
      <rect x="5" y={50 - h} width="10" height={h} rx="1.5" fill="#e9e6da" stroke="#4d5c5e" strokeWidth="1" />
      <rect x="2" y="50" width="16" height="4" rx="2" fill="#4d5c5e" />
    </svg>
  );
}

/** Every burial in the plot, and every offering, each with its transaction. */
export function Register({ burnLedger, logs, totalBurned, tokenSymbol, deadAddress, explorerUrl, copiedDead, onCopyDead, onOpenLog }: RegisterProps) {
  const burials = useMemo(() => {
    const chrono = [...burnLedger].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return chrono
      .filter((e) => e.cycleType !== 'keep' && (burned(e) > 0 || e.burnTx))
      .map((e, i) => ({ e, n: i + 1 }))
      .reverse();
  }, [burnLedger]);

  // offerings: keep entries from the ledger, plus the bot's "forwarded … to treasury" log lines
  const offerings = useMemo(() => {
    const out: Offering[] = [];
    const seen = new Set<string>();
    for (const e of burnLedger) {
      if (e.cycleType !== 'keep') continue;
      const tx = e.claimTx || '';
      seen.add(tx || e.id);
      out.push({ key: e.id, eth: e.retainedETH || e.claimedETH || 0, time: when(e), tx });
    }
    for (const l of logs) {
      const m = /forwarded\s+([\d.]+)\s*ETH\s+to\s+treasury/i.exec(l.details || '');
      if (!m) continue;
      const tx = l.txHash || '';
      const key = tx || l.id;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ key, eth: parseFloat(m[1]) || 0, time: l.timestamp, tx });
    }
    return out;
  }, [burnLedger, logs]);

  const shown = burials.slice(0, 8);
  const biggest = Math.max(1, ...shown.map(({ e }) => burned(e)));

  return (
    <section id="register" aria-labelledby="register-title" className="relative px-4 pb-24 pt-28 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <p className="m-0 label text-lantern">the register</p>
            <h2 id="register-title" className="m-0 mt-3 display text-[clamp(2.8rem,6vw,5.2rem)] text-bone">
              Every burial, on record
            </h2>
          </div>
          <p className="m-0 max-w-[50ch] text-[1.08rem] leading-relaxed text-bone-dim lg:justify-self-end">
            Every time {tokenSymbol} goes in the plot, it is entered here with its transaction, read straight from Robinhood Chain. Each candle is that burial’s size next to the biggest one shown.
          </p>
        </div>

        <div className="parch mt-12 px-5 pb-6 pt-5 sm:px-10 sm:pb-8 sm:pt-7">
          <p className="m-0 mb-3 hand text-[1.7rem] leading-none text-blood/80">the burial register</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-ink/25 pb-4 text-[0.85rem] text-ink-soft">
            <span className="label text-ink-soft">
              burials <span className="text-blood">{burials.length}</span>
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <span className="label text-ink-soft">the plot</span>
              <span className="truncate font-mono text-ink" title={deadAddress}>
                {deadAddress.slice(0, 8)}…{deadAddress.slice(-6)}
              </span>
              <button type="button" onClick={onCopyDead} className="btn-ink cursor-pointer px-2.5 py-1 text-[0.66rem]">
                {copiedDead ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedDead ? 'copied' : 'copy'}
              </button>
            </span>
          </div>

          <ol className="m-0 list-none p-0" aria-label="Recent burials in the plot">
            {shown.length === 0 ? (
              <li data-log-row className="flex items-center gap-4 py-8">
                <Candle share={1} />
                <p className="m-0 text-[1.05rem] text-ink-soft">
                  {totalBurned > 0 ? `${compact(totalBurned)} ${tokenSymbol} already laid down. Reading the register from the chain…` : 'Nothing in the plot yet. The first burial shows up here with its transaction.'}
                </p>
              </li>
            ) : (
              shown.map(({ e, n }) => {
                const tx = e.burnTx || e.buyTx || e.claimTx;
                const amt = burned(e);
                return (
                  <li key={e.id} data-log-row className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-5 gap-y-1 border-b border-ink/15 py-4 last:border-b-0 sm:grid-cols-[1.25rem_minmax(0,1.2fr)_minmax(0,0.8fr)_auto]">
                    <Candle share={Math.max(0.05, amt / biggest)} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <span className="label text-ink-soft">burial {n}</span>
                        <span className="font-mono text-[0.8rem] text-ink-soft">{when(e)}</span>
                      </div>
                      <div className="display text-[clamp(1.7rem,2.6vw,2.3rem)] tabular text-ink">
                        {fmt(amt)} <span className="text-[0.62em] text-blood">{tokenSymbol}</span>
                      </div>
                    </div>
                    <span className="col-start-2 hand -rotate-2 text-[1.6rem] text-blood sm:col-start-auto" aria-hidden="true">
                      {REMARKS[(n - 1) % REMARKS.length]}
                    </span>
                    {tx && tx.startsWith('0x') ? (
                      <a href={`${explorerUrl}/tx/${tx}`} target="_blank" rel="noreferrer" className="col-start-2 inline-flex items-center gap-1 font-mono text-[0.82rem] text-ink underline decoration-ink/40 hover:text-blood sm:col-start-auto sm:justify-self-end">
                        {shortHash(tx)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </li>
                );
              })
            )}
          </ol>
          <button type="button" onClick={onOpenLog} className="btn-ink mt-6 cursor-pointer px-5 py-2.5 text-[0.78rem]">
            <ScrollText className="h-4 w-4" />
            open the full register
          </button>
        </div>

        <div id="offerings" className="mt-20 grid gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex items-start gap-5">
            <svg viewBox="0 0 64 64" className="mt-1 h-16 w-16 shrink-0" aria-hidden="true">
              <path d="M32 6 Q40 18 32 26 Q24 18 32 6 Z" fill="#e8a33d" />
              <rect x="20" y="28" width="24" height="26" rx="3" fill="none" stroke="#e58f7b" strokeWidth="2.4" />
              <path d="M14 28 H50 M26 28 Q26 20 32 20 Q38 20 38 28 M12 58 H52" stroke="#e58f7b" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            </svg>
            <div>
              <h3 className="m-0 display text-[clamp(2.2rem,3.4vw,3rem)] text-offer">The offerings</h3>
              <p className="m-0 mt-3 max-w-[44ch] text-[1.03rem] leading-relaxed text-bone-dim">
                Every other run is an offering: the fees go to the project wallet instead of the plot, to keep the lantern lit. Those runs are entered here too, in full.
              </p>
            </div>
          </div>
          {offerings.length === 0 ? (
            <div className="self-end rounded-[18px] border border-dashed border-offer/35 bg-offer-ink/10 px-6 py-5">
              <p className="m-0 label text-offer">no offerings yet</p>
              <p className="m-0 mt-2 text-[1rem] leading-relaxed text-bone-dim">The next one shows up here with its transaction. Older ones are in the project wallet’s history.</p>
            </div>
          ) : (
            <ol className="m-0 list-none self-end p-0">
              {offerings.slice(0, 4).map((f) => (
                <li key={f.key} data-log-row className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-panel-line py-3">
                  <span className="label text-offer">offering</span>
                  <span className="tabular font-mono text-[1rem] text-bone">{f.eth.toFixed(4)} ETH</span>
                  <span className="font-mono text-[0.85rem] text-bone-dim">{f.time}</span>
                  {f.tx && f.tx.startsWith('0x') ? (
                    <a href={`${explorerUrl}/tx/${f.tx}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[0.85rem] text-offer underline decoration-offer/40">
                      {shortHash(f.tx)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
