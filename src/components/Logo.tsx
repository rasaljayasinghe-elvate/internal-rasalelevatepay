import { useId } from "react";

export function LogoMark({ className = "size-7" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 1024 1024" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3536FD" />
          <stop offset="1" stopColor="#17175D" />
        </linearGradient>
        <clipPath id={`${id}-shape`}>
          <rect width="1024" height="1024" rx="280" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-shape)`}>
        <rect width="1024" height="1024" fill={`url(#${id}-bg)`} />
        <path
          d="M42 1140 L512 326 L982 1140"
          fill="none"
          stroke="#fff"
          strokeWidth="190"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="text-lg font-bold tracking-tight text-navy">ElevatePay</span>
    </span>
  );
}
