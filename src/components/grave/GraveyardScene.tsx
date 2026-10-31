import { forwardRef, useImperativeHandle, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export interface GraveyardHandle {
  /** Morrow drops one $GRAVE token into the open plot. */
  drop: () => void;
}

interface GraveyardSceneProps {
  /** escrow fill 0..1: the wisp over the plot glows harder as it rises */
  fill: number;
  /** the bot is running a real cycle right now */
  running?: boolean;
  className?: string;
}

const STONES = [
  { x: 60, y: 388, w: 54, h: 82, tilt: -5, c: '#1b292e' },
  { x: 176, y: 404, w: 40, h: 62, tilt: 4, c: '#16232a' },
  { x: 268, y: 394, w: 34, h: 70, tilt: -2, c: '#1b292e', cross: true },
  { x: 1012, y: 396, w: 38, h: 64, tilt: 5, c: '#16232a', cross: true },
  { x: 1102, y: 384, w: 58, h: 86, tilt: -3, c: '#1b292e' },
  { x: 1214, y: 406, w: 42, h: 60, tilt: 6, c: '#16232a' },
  { x: 1320, y: 392, w: 50, h: 76, tilt: -4, c: '#1b292e' },
];

/**
 * The yard behind the big headstone: moon, a bare tree, iron fence and rows of old stones in the fog.
 * The open plot lies to the right of the big stone, under the button that drops a token in. Drawn on a 1440 by 620 grid, wider than any phone.
 */
export const GraveyardScene = forwardRef<GraveyardHandle, GraveyardSceneProps>(function GraveyardScene({ fill, running = false, className }, ref) {
  const root = useRef<SVGSVGElement>(null);

  const { contextSafe } = useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !root.current) return;
      gsap.to(root.current.querySelector('[data-lantern]'), { opacity: 0.72, duration: 0.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    },
    { scope: root },
  );

  const drop = contextSafe(() => {
    const coin = root.current?.querySelector('[data-coin]');
    if (!coin) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.killTweensOf(coin);
    gsap.fromTo(coin, { attr: { cy: 400 }, opacity: 1 }, { attr: { cy: 574 }, duration: 0.7, ease: 'power2.in', onComplete: () => void gsap.set(coin, { opacity: 0 }) });
    gsap.fromTo(root.current!.querySelector('[data-puff]'), { attr: { r: 4 }, opacity: 0.6 }, { attr: { r: 60 }, opacity: 0, duration: 0.8, delay: 0.66, ease: 'expo.out' });
  });
  useImperativeHandle(ref, () => ({ drop }), [drop]);

  return (
    <svg ref={root} viewBox="0 0 1440 620" preserveAspectRatio="xMidYMax slice" overflow="visible" className={`overflow-visible ${running ? 'running ' : ''}${className ?? ''}`} aria-hidden="true">
      <defs>
        <radialGradient id="yd-moon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#dfe8e0" stopOpacity="0.3" />
          <stop offset="1" stopColor="#dfe8e0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="yd-lamp" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#e8a33d" stopOpacity="0.5" />
          <stop offset="1" stopColor="#e8a33d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="yd-wisp" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#8fe6d2" stopOpacity="0.6" />
          <stop offset="1" stopColor="#8fe6d2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="yd-fog" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7f9ea0" stopOpacity="0" />
          <stop offset="1" stopColor="#7f9ea0" stopOpacity="0.16" />
        </linearGradient>
      </defs>

      <circle cx="1130" cy="-40" r="170" fill="url(#yd-moon)" />
      <circle cx="1130" cy="-40" r="58" fill="#dfe8e0" />
      <circle cx="1112" cy="-56" r="10" fill="#c7d2ca" />
      <circle cx="1146" cy="-24" r="14" fill="#c7d2ca" />
      {Array.from({ length: 34 }, (_, i) => (
        <circle key={i} cx={(i * 197) % 1440} cy={(i * 83) % 250} r={i % 5 ? 1 : 1.8} fill="#e9e6da" opacity={i % 3 ? 0.35 : 0.75} />
      ))}

      {/* distant hill and fence */}
      <path d="M0 400 Q300 340 640 380 T1440 350 V620 H0 Z" fill="#0f1a1f" />
      <g stroke="#0a1215" strokeWidth="4">
        {Array.from({ length: 62 }, (_, i) => (
          <path key={i} d={`M${i * 24} 420 V368 l4 -12 l4 12`} fill="#0a1215" />
        ))}
        <path d="M0 382 H1460 M0 410 H1460" />
      </g>

      {/* the bare tree */}
      <path d="M150 470 Q166 360 150 270 Q120 220 70 196 M152 300 Q190 240 250 216 M152 270 Q150 210 176 150 M118 232 Q104 190 112 150 M214 228 Q240 196 240 160 M176 180 Q204 150 214 112" stroke="#080f12" strokeWidth="11" fill="none" strokeLinecap="round" />
      <path d="M78 202 Q50 196 34 170 M228 222 Q262 222 292 206 M112 170 Q92 150 94 122 M190 164 Q170 140 170 108" stroke="#080f12" strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* old stones */}
      {STONES.map((s, i) => (
        <g key={i} transform={`rotate(${s.tilt} ${s.x + s.w / 2} ${s.y + s.h})`}>
          {s.cross ? (
            <path d={`M${s.x + s.w / 2} ${s.y} v${s.h} M${s.x} ${s.y + s.h * 0.3} h${s.w}`} stroke={s.c} strokeWidth="13" />
          ) : (
            <path d={`M${s.x} ${s.y + s.h} v-${s.h - s.w / 2} a${s.w / 2} ${s.w / 2} 0 0 1 ${s.w} 0 v${s.h - s.w / 2} z`} fill={s.c} />
          )}
        </g>
      ))}

      {/* the lantern on its post */}
      <circle data-lantern cx="1250" cy="334" r="120" fill="url(#yd-lamp)" />
      <path d="M1250 470 V352 M1250 352 q18 -2 18 -18" stroke="#080f12" strokeWidth="7" fill="none" />
      <rect x="1258" y="334" width="20" height="28" rx="3" fill="#ffd27a" stroke="#080f12" strokeWidth="4" />

      {/* the ground and the open plot */}
      <path d="M0 468 Q360 440 720 462 T1440 452 V620 H0 Z" fill="#0a1316" />
      <path d="M0 540 Q360 512 720 532 T1440 520 V620 H0 Z" fill="#070d10" />
      <g transform="translate(410 -12)">
        <ellipse cx="720" cy="524" rx="330" ry="110" fill="url(#yd-wisp)" style={{ opacity: 0.3 + fill * 0.7, transition: 'opacity 1.2s' }} />
        <path d="M560 578 Q720 560 880 578 L852 612 H588 Z" fill="#020405" />
        <path d="M520 584 Q548 566 582 576 L566 606 Q538 604 520 584 Z M920 584 Q892 566 858 576 L874 606 Q902 604 920 584 Z" fill="#1a2126" />
        <circle data-coin cx="720" cy="400" r="11" fill="#e8a33d" stroke="#8a5d17" strokeWidth="2.5" opacity="0" />
        <circle data-puff cx="720" cy="586" r="4" fill="#8fe6d2" opacity="0" />
      </g>

      <rect width="1440" height="620" fill="url(#yd-fog)" />
    </svg>
  );
});
