/** The mark: Morrow on the headstone (artwork in /public/grave-logo-*.png). */
export function GraveMark({ className, title }: { className?: string; title?: string }) {
  return (
    <img
      src="/grave-logo-192.png"
      srcSet="/grave-logo-192.png 192w, /grave-logo-512.png 512w"
      sizes="(min-width: 640px) 96px, 64px"
      width={192}
      height={192}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      draggable={false}
      className={`rounded-full object-cover ${className ?? ''}`}
    />
  );
}
