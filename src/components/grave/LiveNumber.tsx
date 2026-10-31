import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface LiveNumberProps {
  value: number;
  format: (n: number) => string;
  className?: string;
}

/**
 * A live reading. It counts up the first time it is seen, then re-inks only
 * the digits that change. The real value renders without JS.
 */
export function LiveNumber({ value, format, className }: LiveNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [settled, setSettled] = useState(false);
  const latest = useRef(value);
  latest.current = value;
  const prev = useRef(format(value));
  const text = format(value);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || settled) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || latest.current <= 0) {
        setSettled(true);
        return;
      }
      const shown = { v: 0 };
      el.textContent = format(0);
      ScrollTrigger.create({
        trigger: el,
        start: 'top 95%',
        once: true,
        onEnter: () =>
          gsap.to(shown, {
            v: latest.current,
            duration: 2,
            ease: 'expo.out',
            onUpdate: () => {
              el.textContent = format(shown.v);
            },
            onComplete: () => setSettled(true),
          }),
      });
    },
    { scope: ref, dependencies: [settled] },
  );

  const before = prev.current;
  useEffect(() => {
    prev.current = text;
  }, [text]);

  if (!settled) {
    return (
      <span ref={ref} className={className}>
        {text}
      </span>
    );
  }

  // align from the right so unchanged trailing digits keep their keys
  const offset = text.length - before.length;
  return (
    <span className={className} aria-label={text}>
      {text.split('').map((ch, i) => (
        <span key={`${i}-${ch}`} aria-hidden="true" className={before[i - offset] === ch ? 'inline-block' : 'reink inline-block'}>
          {ch}
        </span>
      ))}
    </span>
  );
}
