import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Fixed full-page paper grain (SVG turbulence) + photographed-page vignette. */
export function PaperGrain() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50">
      <svg className="absolute inset-0 h-full w-full opacity-[0.05] mix-blend-multiply">
        <filter id="paper-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#paper-grain)" />
      </svg>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 45%, transparent 55%, rgba(23,20,15,0.10) 100%)",
        }}
      />
    </div>
  );
}

/** Hand-cut panel with an ink border. */
export function Panel({
  children,
  className = "",
  deep = false,
}: {
  children: ReactNode;
  className?: string;
  deep?: boolean;
}) {
  return (
    <div className={`${deep ? "ink-frame-deep" : "ink-frame"} ${className}`}>
      {children}
    </div>
  );
}

/** Washi tape strip that pins things to the page. */
export function WashiTape({
  className = "",
  angle = -2,
  width = 96,
}: {
  className?: string;
  angle?: number;
  width?: number | string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute h-7 ${className}`}
      style={{
        width,
        transform: `rotate(${angle}deg)`,
        background:
          "repeating-linear-gradient(to bottom, rgba(23,20,15,0.10) 0 1px, rgba(91,86,76,0.16) 1px 7px)",
        opacity: 0.55,
        boxShadow: "1px 1px 2px rgba(23,20,15,0.12)",
      }}
    />
  );
}

/** Big rubber stamp (VICTORY / DEFEAT / rank marks). */
export function Stamp({
  children,
  tone = "ink",
  className = "",
}: {
  children: ReactNode;
  tone?: "ink" | "red";
  className?: string;
}) {
  const color = tone === "red" ? "var(--color-red-stamp)" : "var(--color-ink)";
  return (
    <span
      className={`label-type inline-block select-none whitespace-nowrap px-3 py-1 ${className}`}
      style={{
        color,
        border: `3px solid ${color}`,
        borderRadius: "6px 10px 7px 11px / 11px 7px 10px 6px",
        textShadow: `0 0 1px ${color}`,
        maskImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.12' numOctaves='3'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='2.4' intercept='-0.35'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
        maskSize: "120px 120px",
      }}
    >
      {children}
    </span>
  );
}

/** Handwritten margin note. */
export function HandNote({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`font-hand text-graphite ${className}`}>{children}</span>
  );
}

type StampButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "md" | "lg";
};

/** The house button: typewriter label, rubber-stamp press. */
export function StampButton({
  size = "md",
  className = "",
  children,
  ...rest
}: StampButtonProps) {
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-4 text-lg",
  } as const;
  return (
    <button className={`stamp-btn focus-ink ${sizes[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
