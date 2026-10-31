import { useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface BurialOrderProps {
  tokenSymbol: string;
  escrow: number;
  threshold: number;
  fill: number;
  claimedETH: number;
  routerName: string;
  nextCycle: 'burn' | 'keep';
}

interface Item {
  name: string;
  body: ReactNode;
  readingLabel: string;
  reading: string;
}

/**
 * One run seen from the side of the plot, on a 400 by 480 grid. The grave deepens with each step
 * and Morrow watches from the stone; on the last step the tokens go down, or the fees go to the wallet.
 */
function Cutaway({ step, burial }: { step: number; burial: boolean }) {
  const depth = 60 + step * 30;
  const ink = burial ? '#8fe6d2' : '#e58f7b';
  return (
    <svg viewBox="0 0 400 480" className="h-full w-full" role="img" aria-label={`Step ${step + 1} of the service`}>
      <rect width="400" height="150" fill="#0f1c21" />
      <circle cx="320" cy="62" r="26" fill="#dfe8e0" />
      <rect y="150" width="400" height="330" fill="#11181b" />
      {[190, 236, 288, 340, 402, 446].map((y, i) => (
        <path key={y} d={`M0 ${y} Q100 ${y - 8 + i * 2} 200 ${y} T400 ${y}`} stroke="#1b2529" strokeWidth="2" fill="none" />
      ))}
      <path d="M0 150 H128 M272 150 H400" stroke="#2b3d44" strokeWidth="4" />

      {/* the grave, deeper each step */}
      <path d={`M128 150 V${150 + depth} H272 V150 Z`} fill="#040809" style={{ transition: 'd 0.8s cubic-bezier(0.16,1,0.3,1)' }} />

      {/* the mound of dug earth */}
      <path d={`M284 150 Q ${330} ${150 - 18 - step * 7} 384 150 Z`} fill="#1a2126" style={{ transition: 'd 0.8s' }} />

      {/* the stone with Morrow on it */}
      <path d="M46 150 V92 Q46 66 72 66 Q98 66 98 92 V150 Z" fill="#8e9690" />
      <path d="M72 88 V122 M60 100 H84" stroke="#2b3d44" strokeWidth="4" strokeLinecap="round" />
      <path d="M56 66 Q58 46 74 46 Q80 46 84 50 L96 52 L84 57 Q82 66 76 68 L68 66 L46 74 Z" fill="#050809" />
      <circle cx="76" cy="52" r="2.2" fill={step >= 2 ? '#e8a33d' : '#4d5c5e'} />

      {/* I and II: grains falling into the escrow glass */}
      <g style={{ opacity: step <= 1 ? 1 : 0, transition: 'opacity 0.4s' }}>
        <path d="M184 18 H216 V34 L204 48 L216 62 V78 H184 V62 L196 48 L184 34 Z" fill="#0d1619" stroke="#93a6a8" strokeWidth="2.5" />
        <path d={step === 1 ? 'M186 76 V58 H214 V76 Z' : 'M190 76 V70 H210 V76 Z'} fill={ink} />
      </g>

      {/* III: ETH claimed */}
      <g style={{ opacity: step === 2 ? 1 : 0, transition: 'opacity 0.4s' }}>
        <circle cx="200" cy="60" r="20" fill="#93a6a8" />
        <text x="200" y="68" textAnchor="middle" fontSize="22" fontWeight="700" fill="#090f12">Ξ</text>
      </g>

      {/* IV: ETH becomes tokens */}
      <g style={{ opacity: step === 3 ? 1 : 0, transition: 'opacity 0.4s' }}>
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={176 + i * 24} cy={60 - (i % 2) * 8} r="14" fill="#e8a33d" stroke="#8a5d17" strokeWidth="2.5" />
        ))}
      </g>

      {/* V: down they go, or off to the wallet */}
      <g style={{ opacity: step === 4 ? 1 : 0, transition: 'opacity 0.4s' }}>
        {burial ? (
          [0, 1, 2, 3, 4].map((i) => <circle key={i} cx={160 + i * 20} cy={280 - (i % 3) * 10} r="10" fill="#e8a33d" stroke="#8a5d17" strokeWidth="2" />)
        ) : (
          <>
            <path d="M200 120 H330" stroke={ink} strokeWidth="3" strokeDasharray="4 7" />
            <path d="M322 112 L334 120 L322 128" stroke={ink} strokeWidth="3" fill="none" />
            <rect x="338" y="100" width="44" height="34" rx="4" fill="#8a3b2c" stroke={ink} strokeWidth="2.5" />
          </>
        )}
        <text x="200" y="452" textAnchor="middle" fontSize="12" fontWeight="700" letterSpacing="2" fill={ink}>
          {burial ? '0x…dEaD' : 'PROJECT WALLET'}
        </text>
      </g>
    </svg>
  );
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

/** The order of service: the steps of one run, read while the plot beside them is dug deeper. */
export function BurialOrder({ tokenSymbol, escrow, threshold, fill, claimedETH, routerName, nextCycle }: BurialOrderProps) {
  const burial = nextCycle === 'burn';
  const listRef = useRef<HTMLOListElement>(null);
  const [step, setStep] = useState(0);

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>('[data-item]').forEach((el, i) => {
        ScrollTrigger.create({ trigger: el, start: 'top 58%', end: 'bottom 58%', onToggle: (self) => self.isActive && setStep(i) });
      });
    },
    { scope: listRef },
  );

  const items: Item[] = [
    {
      name: 'Trades add a grain',
      body: <>Every {tokenSymbol} buy and sell pays a creator fee in ETH. It collects in the Pons fee escrow, our hourglass.</>,
      readingLabel: 'in the glass now',
      reading: `${escrow.toFixed(4)} ETH`,
    },
    {
      name: 'The glass runs through',
      body: <>It collects up to the size of the next run: 0.01 ETH for a burial, 0.02 ETH for an offering. Then the service starts.</>,
      readingLabel: 'glass filled',
      reading: `${Math.round(fill * 100)}% of ${threshold ? threshold.toFixed(2) : '—'} ETH`,
    },
    {
      name: 'Morrow claims it',
      body: <>Morrow, the bot, claims everything in the escrow on its own, at any hour. Crows keep no office hours.</>,
      readingLabel: 'ETH claimed so far',
      reading: `${claimedETH.toFixed(4)} ETH`,
    },
    {
      name: `It buys ${tokenSymbol}`,
      body: <>For a burial, the claimed ETH market-buys {tokenSymbol} on {routerName}. Real buying, every time.</>,
      readingLabel: 'buying on',
      reading: routerName.replace(/^the /, ''),
    },
    {
      name: 'Burial or offering',
      body: (
        <>
          Runs take turns. <strong className="font-semibold text-wisp">Odd runs are burials: every token bought goes in the plot</strong>, which is 0x…dEaD.{' '}
          <strong className="font-semibold text-offer">Even runs are offerings: the fees go to the project wallet</strong> that keeps the lantern lit.
        </>
      ),
      readingLabel: 'next run',
      reading: burial ? 'burial · into the plot' : 'offering · to the wallet',
    },
  ];

  return (
    <section id="service" aria-labelledby="service-title" className="relative px-4 py-28 sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-[76rem] gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-24">
        <div className="hidden lg:block">
          <div className="sticky top-28 aspect-[5/6] overflow-hidden rounded-[3px] border border-panel-line">
            <Cutaway step={step} burial={burial} />
          </div>
        </div>
        <div>
          <p className="m-0 label text-lantern">order of service</p>
          <h2 id="service-title" className="m-0 mt-3 max-w-[14ch] display text-[clamp(2.8rem,6vw,5rem)] text-bone">
            From fee to plot, in five parts
          </h2>
          <ol ref={listRef} className="m-0 mt-14 list-none p-0">
            {items.map((s, i) => (
              <li key={s.name} data-item className={`grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 border-t border-panel-line py-10 transition-opacity duration-500 lg:min-h-[19rem] ${step === i ? 'lg:opacity-100' : 'lg:opacity-45'}`}>
                <span className="display text-[1.9rem] text-lantern">{ROMAN[i]}</span>
                <div>
                  <h3 className="m-0 display text-[clamp(1.9rem,3vw,2.6rem)] text-bone">{s.name}</h3>
                  <p className="m-0 mt-3 max-w-[46ch] text-[1.05rem] leading-relaxed text-bone/80">{s.body}</p>
                  <p className="m-0 mt-5 flex flex-wrap items-baseline gap-3">
                    <span className="label text-bone-dim">{s.readingLabel}</span>
                    <span className={`tabular font-mono text-[1rem] ${i === 4 ? (burial ? 'text-wisp' : 'text-offer') : 'text-bone'}`}>{s.reading}</span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
