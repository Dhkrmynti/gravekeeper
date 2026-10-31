import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Copy, ExternalLink, LogOut, Wallet } from 'lucide-react';
import { useWallet } from './useWallet';

interface WalletButtonProps {
  tokenAddress: string;
  tokenSymbol: string;
  totalSupply: number;
  explorerUrl: string;
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const fmtEth = (n: number | null) => (n === null ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: 4 }));
const fmtTokens = (n: number | null) => (n === null ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.floor(n)));

/** Connect wallet in the header: the visitor's own address, balances and share of the supply. Read-only. */
export function WalletButton({ tokenAddress, tokenSymbol, totalSupply, explorerUrl }: WalletButtonProps) {
  const w = useWallet(tokenAddress);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // close on outside click and Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onButton = () => {
    if (w.address && !w.onRightChain) return void w.switchNetwork();
    if (w.address || !w.hasWallet) return setOpen((v) => !v);
    w.connect();
  };

  const copy = () => {
    if (!w.address) return;
    navigator.clipboard.writeText(w.address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const share = w.tokenBalance && totalSupply > 0 ? (w.tokenBalance / totalSupply) * 100 : 0;
  const dappLink = typeof window === 'undefined' ? '' : `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;

  const wrong = Boolean(w.address && !w.onRightChain);
  const label = w.connecting ? 'Connecting…' : wrong ? 'Wrong network' : w.address ? short(w.address) : 'Connect wallet';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={onButton}
        disabled={w.connecting}
        aria-haspopup={w.address || !w.hasWallet ? 'dialog' : undefined}
        aria-expanded={open}
        title={wrong ? 'Switch to Robinhood Chain' : w.address ? 'Your wallet' : 'Connect a wallet'}
        className={`${wrong ? 'btn-lantern' : 'btn-ghost'} h-10 cursor-pointer gap-2 whitespace-nowrap px-3 text-[0.68rem] disabled:cursor-wait disabled:opacity-70 sm:px-4`}
      >
        {wrong ? (
          <AlertTriangle className="h-4 w-4" />
        ) : w.address ? (
          <span className="h-2 w-2 rounded-full bg-wisp shadow-[0_0_8px_1px_rgba(156,240,90,0.6)]" aria-hidden="true" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        <span className={w.address ? 'font-mono text-[0.78rem] normal-case tracking-normal' : 'hidden sm:inline'}>{label}</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label={w.address ? 'Your wallet' : 'No wallet found'}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="slab absolute right-0 top-[calc(100%+0.6rem)] z-50 w-[min(20rem,calc(100vw-2rem))] origin-top-right p-5"
          >
            {w.address ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="label text-[0.62rem] text-bone-dim">your wallet</span>
                  <span className="flex items-center gap-1.5 text-[0.75rem] text-wisp">
                    <span className="h-1.5 w-1.5 rounded-full bg-wisp" aria-hidden="true" />
                    Robinhood Chain
                  </span>
                </div>
                <button type="button" onClick={copy} className="mt-2 flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-panel-line px-3 py-2 text-left transition-colors hover:border-lantern" title="Copy address">
                  <span className="truncate font-mono text-[0.85rem] text-bone">{short(w.address)}</span>
                  {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-wisp" /> : <Copy className="h-3.5 w-3.5 shrink-0 text-bone-dim" />}
                </button>

                <dl className="m-0 mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <dt className="label text-[0.58rem] text-bone-dim">ETH</dt>
                    <dd className="m-0 mt-0.5 tabular font-mono text-[0.95rem] text-bone">{fmtEth(w.ethBalance)}</dd>
                  </div>
                  <div>
                    <dt className="label text-[0.58rem] text-bone-dim">{tokenSymbol}</dt>
                    <dd className="m-0 mt-0.5 tabular font-mono text-[0.95rem] text-lantern-hot">{tokenAddress ? fmtTokens(w.tokenBalance) : 'at launch'}</dd>
                  </div>
                </dl>
                {share > 0 ? (
                  <p className="m-0 mt-3 hand text-[1.35rem] leading-none text-wisp">you hold {share < 0.01 ? '<0.01' : share.toFixed(2)}% of the supply</p>
                ) : null}

                <div className="mt-5 flex items-center justify-between gap-2 border-t border-panel-line pt-4">
                  <a href={`${explorerUrl}/address/${w.address}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[0.82rem] text-bone-dim no-underline transition-colors hover:text-lantern-hot">
                    Explorer
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      w.disconnect();
                      setOpen(false);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 text-[0.82rem] text-bone-dim transition-colors hover:text-blood"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Disconnect
                  </button>
                </div>
                <p className="m-0 mt-3 text-[0.72rem] leading-snug text-bone-dim/80">Read-only: this site never asks you to sign or send anything.</p>
              </>
            ) : (
              <>
                <p className="m-0 display text-[1.6rem] leading-none text-bone">No wallet found</p>
                <p className="m-0 mt-2 text-[0.9rem] leading-relaxed text-bone-dim">Install a browser wallet like MetaMask or Rabby, or open this page inside your wallet app.</p>
                <div className="mt-4 flex flex-col gap-2">
                  <a href={dappLink} className="btn-lantern px-4 py-2.5 text-[0.7rem] no-underline">
                    Open in MetaMask app
                  </a>
                  <div className="flex gap-2">
                    <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="btn-ghost flex-1 px-3 py-2 text-[0.64rem] no-underline">
                      MetaMask
                    </a>
                    <a href="https://rabby.io/" target="_blank" rel="noreferrer" className="btn-ghost flex-1 px-3 py-2 text-[0.64rem] no-underline">
                      Rabby
                    </a>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
