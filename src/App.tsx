import { useState, useEffect, useRef } from 'react';
import { useFlywheelEngine } from './hooks/useBurnEngine';
import { PONS_V2_CONFIG } from './contracts';
import { sounds } from './utils/audio';
import { Volume2, VolumeX, Copy, Check, ArrowUpRight, ScrollText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { BurnLedgerDrawer } from './components/BurnLedgerDrawer';
import { MemexAdmin } from './components/MemexAdmin';
import { GraveMark } from './components/grave/GraveMark';
import { LiveNumber } from './components/grave/LiveNumber';
import { GraveyardScene, type GraveyardHandle } from './components/grave/GraveyardScene';
import { Hourglass } from './components/grave/Hourglass';
import { BurialOrder } from './components/grave/BurialOrder';
import { Register } from './components/grave/Register';
import { Perch } from './components/grave/Perch';
import { WalletButton } from './components/grave/WalletButton';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** What Morrow says when a token goes down. */
const MORROW_SAYS = [
  'kraa. down it goes.',
  'rest well.',
  'odd runs bury. even runs keep.',
  'keep trading, mourner.',
  'nobody climbs out.',
  'kraa.',
  'there is always room.',
  'happy halloween.',
];

/** X account for the project: empty until there is one. */
const X_URL = '';
const EXPLORER_URL = 'https://explorer.mainnet.chain.robinhood.com';
/** Where to trade and where to watch, once the CA is known. */
const buyUrl = (ca: string) => (ca ? `https://ponsfamily.com/launchpad/${ca}` : EXPLORER_URL);
const chartUrl = (ca: string) => (ca ? `https://dexscreener.com/robinhood/${ca}` : EXPLORER_URL);

const STORY = [
  {
    title: 'The yard',
    text: 'Past the last streetlight there is a walled yard nobody remembers paying for. The keeper left one Halloween and took the shovel. A crow stayed. Its name is Morrow.',
  },
  {
    title: 'The plot',
    text: 'One grave in the yard was never filled in, and whatever goes down it stays down. On chain, that plot has an address: 0x…dEaD.',
  },
  {
    title: 'The service',
    text: 'Every $GRAVE trade adds ETH to the fee escrow. When the hourglass runs through, Morrow holds the service: burials lay $GRAVE in the plot, offerings keep the lantern lit.',
  },
];

export function App() {
  const { state, config, setConfig, logs, burnLedger } = useFlywheelEngine();

  const getIsMemex = () => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return path.startsWith('/memex') || hash.startsWith('#memex') || hash.startsWith('#/memex');
  };

  const [isMemexRoute, setIsMemexRoute] = useState(getIsMemex());
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [copiedCA, setCopiedCA] = useState(false);
  const [copiedDead, setCopiedDead] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [thrown, setThrown] = useState(0);
  const [sayIndex, setSayIndex] = useState(0);
  const pageRef = useRef<HTMLDivElement>(null);
  const yardRef = useRef<GraveyardHandle>(null);

  useEffect(() => {
    const handleLocationChange = () => setIsMemexRoute(getIsMemex());
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Late fonts change line heights; re-measure every trigger once they land
  useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);

  // While the bot is really running, tokens keep going down
  useEffect(() => {
    if (!state.isWheelSpinning) return;
    const id = window.setInterval(() => yardRef.current?.drop(), 1800);
    return () => window.clearInterval(id);
  }, [state.isWheelSpinning]);

  const throwOne = () => {
    setThrown((prev) => prev + 1);
    setSayIndex((prev) => (prev + 1) % MORROW_SAYS.length);
    yardRef.current?.drop();
    sounds.playBuybackSound();
  };

  const navigateToHome = () => {
    window.history.pushState({}, '', '/');
    setIsMemexRoute(false);
  };

  const threshold = state.currentThresholdETH || state.claimThresholdETH || config.claimThresholdETH || 0;
  const escrow = state.currentEscrowBalanceETH || 0;
  const barFill = threshold > 0 ? Math.max(0, Math.min(1, escrow / threshold)) : 0;

  // The wisp over the plot glows brighter as the hourglass fills
  useEffect(() => {
    document.documentElement.style.setProperty('--hearth', barFill.toFixed(3));
  }, [barFill]);

  useGSAP(
    () => {
      if (isMemexRoute) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Arrival: the fog lifts off the stone, then the first token goes down
        const intro = gsap.timeline();
        intro
          .from('[data-stone]', { y: 120, duration: 1.3, ease: 'expo.out' }, 0.1)
          .from('[data-hero-line]', { y: 18, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.08 }, 0.5)
          .call(() => yardRef.current?.drop(), [], 1.5);

        // Leaving the first view: the yard sinks slower than the page
        gsap.to('[data-scene]', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true } });

        gsap.utils.toArray<HTMLElement>('[data-entry]').forEach((el, i) => {
          gsap.from(el, { y: 50, opacity: 0, duration: 1, ease: 'expo.out', delay: (i % 3) * 0.1, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
        });
        ScrollTrigger.batch('[data-log-row]', {
          start: 'top 92%',
          once: true,
          onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.06 }),
        });
      });

      // The finale (desktop): the earth rises and fills the screen
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const fin = gsap.timeline({ scrollTrigger: { trigger: '[data-exit]', start: 'top top', end: 'bottom bottom', scrub: 0.6 } });
        fin
          .fromTo('[data-final-earth]', { yPercent: 86 }, { yPercent: 0, ease: 'power1.inOut', duration: 1 })
          .fromTo('[data-final-copy]', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.6);
      });
      return () => {
        mm.revert();
      };
    },
    { scope: pageRef, dependencies: [isMemexRoute] },
  );

  if (isMemexRoute) {
    return <MemexAdmin onBack={navigateToHome} />;
  }

  const copyCA = () => {
    if (!config.tokenAddress) return;
    navigator.clipboard.writeText(config.tokenAddress);
    setCopiedCA(true);
    sounds.playClaimSound();
    setTimeout(() => setCopiedCA(false), 2500);
  };

  const copyDead = () => {
    navigator.clipboard.writeText(config.deadAddress || PONS_V2_CONFIG.contracts.deadAddress);
    setCopiedDead(true);
    sounds.playBurnSound();
    setTimeout(() => setCopiedDead(false), 2000);
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.floor(num));

  const totalTokensBurned =
    state.totalTokensBurned > 0
      ? state.totalTokensBurned
      : burnLedger.reduce((acc, cur) => acc + (cur.burnedJollyburn || cur.burnedMuseburn || cur.burnedIncinerator || 0), 0);

  const burnedPercent =
    state.burnedPercentageOfSupply > 0
      ? state.burnedPercentageOfSupply
      : state.totalSupply > 0
        ? (totalTokensBurned / state.totalSupply) * 100
        : 0;

  const tokenSymbol = '$GRAVE';
  const deadAddress = config.deadAddress || PONS_V2_CONFIG.contracts.deadAddress;
  const isConfigured = Boolean(config.tokenAddress && config.tokenAddress.startsWith('0x') && config.tokenAddress.length === 42);
  const nextCycle = state.nextCycleType || 'burn';
  const routerName = state.swapRouter === 'uniswap' || state.isTokenMigrated ? 'Uniswap v4' : 'the Pons bonding curve';

  return (
    <div ref={pageRef} className="relative min-h-screen overflow-x-clip bg-night font-body text-bone">
      {/* ───────── The nav ───────── */}
      <header className={`fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300 ${scrolled ? 'border-panel-line bg-night/85 backdrop-blur-md' : 'border-transparent'}`}>
        <div className="mx-auto flex h-16 max-w-[84rem] items-center justify-between gap-4 px-4 sm:h-[4.5rem] sm:px-10 lg:px-16">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigateToHome();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="group flex items-center gap-2.5 text-bone no-underline"
            aria-label="Gravekeeper home"
          >
            <GraveMark className="h-9 w-9" />
            <span className="display text-[1.7rem] leading-none">Gravekeeper</span>
          </a>

          <nav className="hidden items-center gap-7 label text-[0.7rem] text-bone-dim md:flex" aria-label="Sections">
            <a href="#service" className="no-underline transition-colors hover:text-lantern-hot">the service</a>
            <a href="#register" className="no-underline transition-colors hover:text-lantern-hot">register</a>
            <a href="#offerings" className="no-underline transition-colors hover:text-lantern-hot">offerings</a>
            <a href="#morrow" className="no-underline transition-colors hover:text-lantern-hot">morrow</a>
            <button type="button" onClick={() => setIsLogOpen(true)} className="label cursor-pointer text-[0.7rem] transition-colors hover:text-lantern-hot">
              full log
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setConfig({ ...config, soundEnabled: !config.soundEnabled })}
              title={config.soundEnabled ? 'Hush the yard' : 'Turn the sounds on'}
              aria-label={config.soundEnabled ? 'Hush the yard' : 'Turn the sounds on'}
              className="btn-ghost h-10 w-10 cursor-pointer"
            >
              {config.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            {X_URL ? (
              <a href={X_URL} target="_blank" rel="noreferrer" title="Gravekeeper on X" aria-label="Gravekeeper on X" className="btn-ghost h-10 w-10">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.9 2H22l-6.8 7.8L23.2 22H17l-4.9-6.4L6.5 22H3.4l7.2-8.2L2.9 2h6.4l4.4 5.8L18.9 2Zm-1.1 17.8h1.7L8.3 4.1H6.5l11.3 15.7Z" />
                </svg>
              </a>
            ) : null}
            <WalletButton tokenAddress={config.tokenAddress} tokenSymbol={tokenSymbol} totalSupply={state.totalSupply} explorerUrl={EXPLORER_URL} />
            {config.tokenAddress ? (
              <button type="button" onClick={copyCA} className="btn-lantern hidden h-10 cursor-pointer px-4 text-[0.68rem] lg:inline-flex" title="Copy contract address">
                {copiedCA ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCA ? 'Copied' : <>CA <span className="font-mono text-[0.78rem] normal-case tracking-normal">{`${config.tokenAddress.slice(0, 6)}…${config.tokenAddress.slice(-4)}`}</span></>}</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* ───────── The yard, and the big headstone ───────── */}
        <section data-hero aria-labelledby="hero-title" className="night-sky relative flex min-h-[100svh] flex-col overflow-hidden pt-16 sm:pt-[4.5rem]">
          <div data-scene className="absolute inset-0">
            <GraveyardScene ref={yardRef} fill={barFill} running={state.isWheelSpinning} className="absolute inset-x-0 bottom-0 h-[72%] w-full" />
          </div>
          <div className="drift fog pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[46%]" aria-hidden="true" />

          <div className="relative z-[3] mx-auto grid w-full max-w-[92rem] flex-1 items-end gap-6 px-4 pb-8 pt-8 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,38rem)_minmax(0,1fr)] lg:pb-10">
            <div data-stone className="stone order-1 w-full px-5 pb-10 pt-14 text-center sm:px-12 sm:pt-16 lg:order-2">
              <p className="carved m-0 label">Here lies</p>
              <h1 id="hero-title" className="carved m-0 mt-2 display text-[clamp(3.1rem,9vw,5.6rem)] leading-none">
                {totalTokensBurned > 0 ? (
                  <LiveNumber value={totalTokensBurned} format={(n) => formatNumber(n)} />
                ) : (
                  'The Supply'
                )}
              </h1>
              <p className="carved m-0 mt-3 display text-[1.5rem] italic">
                {totalTokensBurned > 0 ? `${tokenSymbol}, ${burnedPercent > 0 ? (Math.floor(burnedPercent * 100) / 100).toFixed(2) : '0.00'}% of it, at rest` : `${tokenSymbol}, one token at a time`}
              </p>
              <div className="mx-auto my-6 h-px w-24 bg-[#172024]/50" aria-hidden="true" />
              <p data-hero-line className="carved m-0 mx-auto max-w-[42ch] text-[1.02rem] font-medium leading-relaxed">
                Every trade adds ETH to the fee escrow. When the hourglass runs through, Morrow the crow buys {tokenSymbol} back and lays it in the plot at 0x…dEaD. Every other run is an offering to the project wallet.
              </p>

              <div data-hero-line className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <a href={buyUrl(config.tokenAddress)} target="_blank" rel="noreferrer" className="btn-lantern px-7 py-3.5 text-[0.86rem] no-underline">
                  buy {tokenSymbol}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <a href={chartUrl(config.tokenAddress)} target="_blank" rel="noreferrer" className="btn-ink px-5 py-3 text-[0.74rem] no-underline">
                  chart
                </a>
                <button type="button" onClick={() => setIsLogOpen(true)} className="btn-ink cursor-pointer px-4 py-3 text-[0.74rem]" aria-label="Open the full log">
                  <ScrollText className="h-4 w-4" />
                  <span className="hidden sm:inline">log</span>
                </button>
              </div>

              <div data-hero-line className="mt-6">
                {config.tokenAddress ? (
                  <button type="button" onClick={copyCA} className="inline-flex max-w-full cursor-pointer items-center gap-2 font-mono text-[0.78rem] text-[#172024] underline decoration-[#172024]/40" title="Copy contract address">
                    <span className="truncate">{config.tokenAddress}</span>
                    {copiedCA ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                ) : (
                  <p className="carved m-0 text-[0.92rem] font-medium">The contract address is carved here at launch.</p>
                )}
              </div>
            </div>
            <div data-hero-line className="order-2 lg:order-1">
              <Hourglass escrow={escrow} threshold={threshold} fill={barFill} nextCycle={nextCycle} live={isConfigured} running={state.isWheelSpinning} />
            </div>
            <div data-hero-line className="order-3 flex flex-col items-start gap-2 pb-[9vh] lg:items-center" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.p
                  key={sayIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="m-0 hand text-[1.7rem] text-bone"
                >
                  morrow: “{MORROW_SAYS[sayIndex]}”
                </motion.p>
              </AnimatePresence>
              <button type="button" onClick={throwOne} className="btn-ghost cursor-pointer px-3.5 py-2 text-[0.64rem]">
                lay one to rest · {thrown}
              </button>
            </div>
                    </div>
        </section>

        {/* ───────── One run, step by step ───────── */}
        <BurialOrder tokenSymbol={tokenSymbol} escrow={escrow} threshold={threshold} fill={barFill} claimedETH={state.totalFeesClaimedETH || 0} routerName={routerName} nextCycle={nextCycle} />

        {/* ───────── The register and the offerings ───────── */}
        <Register
          burnLedger={burnLedger}
          totalBurned={totalTokensBurned}
          logs={logs}
          tokenSymbol={tokenSymbol}
          deadAddress={deadAddress}
          explorerUrl={EXPLORER_URL}
          copiedDead={copiedDead}
          onCopyDead={copyDead}
          onOpenLog={() => setIsLogOpen(true)}
        />

        {/* ───────── Morrow keeps the yard ───────── */}
        <Perch state={state} config={config} live={isConfigured} onOpenLog={() => setIsLogOpen(true)} />

        {/* ───────── How the yard came to be ───────── */}
        <section id="story" aria-labelledby="story-title" className="relative px-4 pb-32 pt-20 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-[76rem]">
            <p className="m-0 label text-lantern">the epitaph</p>
            <h2 id="story-title" className="m-0 mt-3 max-w-[16ch] display text-[clamp(2.8rem,6vw,5rem)] text-bone">
              Nobody remembers the keeper
            </h2>
            <div className="mt-14 grid gap-10 border-t border-panel-line pt-10 md:grid-cols-3">
              {STORY.map((d) => (
                <div key={d.title} data-entry>
                  <h3 className="m-0 display text-[2rem] italic text-lantern-hot">{d.title}</h3>
                  <p className="m-0 mt-3 text-[1.05rem] leading-relaxed text-bone/80">{d.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── The finale: the earth rises ───────── */}
        <section data-exit aria-labelledby="exit-title" className="relative h-auto lg:h-[200svh]">
          <div className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-night px-4 py-24 sm:px-10 lg:sticky lg:top-0 lg:h-[100svh] lg:py-0">
            <div data-final-earth className="absolute inset-0 bg-[linear-gradient(#2a2622,#171511_40%,#0b0a08)]" aria-hidden="true">
              {Array.from({ length: 26 }, (_, i) => (
                <span key={i} className="absolute block rounded-full bg-[#3b352e]" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, width: 4 + (i % 5) * 4, height: 3 + (i % 4) * 3 }} />
              ))}
            </div>
            <div data-final-copy className="relative z-10 mx-auto max-w-[56rem] pt-12 text-center">
              <GraveMark className="mx-auto h-24 w-24" />
              <h2 id="exit-title" className="m-0 mt-6 display text-[clamp(3.4rem,9vw,7rem)] text-bone">
                Rest in peace.
              </h2>
              <p className="mx-auto mt-6 max-w-[44ch] text-[1.15rem] leading-relaxed text-bone/85">
                Hold {tokenSymbol}, trade {tokenSymbol}, and watch Morrow lay the supply down, one burial at a time.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <a href={buyUrl(config.tokenAddress)} target="_blank" rel="noreferrer" className="btn-lantern px-8 py-4 text-[0.95rem] no-underline">
                  buy {tokenSymbol}
                  <ArrowUpRight className="h-5 w-5" />
                </a>
                {config.tokenAddress ? (
                  <button type="button" onClick={copyCA} className="btn-ghost cursor-pointer px-6 py-4 text-[0.8rem]">
                    {copiedCA ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    {copiedCA ? 'copied' : 'copy CA'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <footer className="relative border-t border-panel-line bg-night">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pb-12 pt-8 text-[0.95rem] text-bone-dim sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-16">
            <div className="flex items-center gap-2.5">
              <GraveMark className="h-8 w-8" />
              <span className="label text-[0.68rem] text-bone">{tokenSymbol} on Robinhood Chain</span>
            </div>
            <p className="m-0 max-w-[52ch]">Burials and offerings are run by a bot and every one is on chain. A meme, not financial advice.</p>
            <div className="font-mono text-[0.8rem]">
              Chain ID 4663 · {!isConfigured ? 'gates closed' : state.isWheelSpinning ? 'service under way' : 'morrow on watch'}
            </div>
          </div>
        </footer>
      </main>

      <BurnLedgerDrawer isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} logs={logs} burnLedger={burnLedger} state={state} config={config} />
    </div>
  );
}

export default App;
