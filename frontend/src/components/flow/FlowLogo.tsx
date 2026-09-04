import React from "react";

interface FlowLogoProps {
  size?: number | string;
  className?: string;
  showWordmark?: boolean;
}

export const FlowLogoMark: React.FC<{ size?: number | string; className?: string }> = ({
  size = 28,
  className = "",
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="Flow Logo"
    >
      <defs>
        {/* Hexagon Background Gradient */}
        <linearGradient id="flowHexGrad" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="45%" stopColor="#1B7F4C" />
          <stop offset="100%" stopColor="#0B4627" />
        </linearGradient>

        {/* Path Flow Gradient */}
        <linearGradient id="flowPathGrad" x1="8" y1="16" x2="24" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B8E6C9" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#6EE7B7" />
        </linearGradient>

        {/* Outer Glow */}
        <filter id="flowGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0E5C36" floodOpacity="0.25" />
        </filter>

        <filter id="nodePulse" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.2" floodColor="#FFFFFF" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* Hexagonal Outer Badge with Smooth Fillets */}
      <path
        d="M16 2.6L26.6 8.7C27.5 9.2 28 10.1 28 11.1V20.9C28 21.9 27.5 22.8 26.6 23.3L16 29.4C15.1 29.9 14 29.9 13.1 29.4L2.5 23.3C1.6 22.8 1.1 21.9 1.1 20.9V11.1C1.1 10.1 1.6 9.2 2.5 8.7L13.1 2.6C14 2.1 15.1 2.1 16 2.6Z"
        fill="url(#flowHexGrad)"
        filter="url(#flowGlow)"
      />

      {/* Hexagon Inner Hairline Rim */}
      <path
        d="M16 3.6L25.8 9.3C26.5 9.7 27 10.4 27 11.3V20.7C27 21.6 26.5 22.3 25.8 22.7L16 28.4C15.3 28.8 14.4 28.8 13.7 28.4L3.9 22.7C3.2 22.3 2.7 21.6 2.7 20.7V11.3C2.7 10.4 3.2 9.7 3.9 9.3L13.7 3.6C14.4 3.2 15.3 3.2 16 3.6Z"
        stroke="#B8E6C9"
        strokeWidth="0.8"
        strokeOpacity="0.4"
      />

      {/* Central Direct Spine (Fast-path connection) */}
      <line
        x1="8.5"
        y1="16"
        x2="23.5"
        y2="16"
        stroke="#B8E6C9"
        strokeWidth="1.2"
        strokeDasharray="1.5 1.5"
        strokeOpacity="0.45"
      />

      {/* Upper Pipeline Path (Input -> Gen -> Output) */}
      <path
        d="M 8.5 16 C 11.5 16, 12.5 9.5, 16 9.5 C 19.5 9.5, 20.5 16, 23.5 16"
        stroke="url(#flowPathGrad)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Lower Pipeline Path (Input -> Style -> Output) */}
      <path
        d="M 8.5 16 C 11.5 16, 12.5 22.5, 16 22.5 C 19.5 22.5, 20.5 16, 23.5 16"
        stroke="url(#flowPathGrad)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Node 1: Input / Brief (Left) */}
      <circle cx="8.5" cy="16" r="2.2" fill="#B8E6C9" stroke="#FFFFFF" strokeWidth="0.8" />

      {/* Node 2a: Image Gen Nexus (Top) */}
      <circle cx="16" cy="9.5" r="2.5" fill="#34D399" stroke="#FFFFFF" strokeWidth="0.8" />
      <circle cx="16" cy="9.5" r="1" fill="#FFFFFF" />

      {/* Node 2b: Style Transfer Nexus (Bottom) */}
      <circle cx="16" cy="22.5" r="2.5" fill="#34D399" stroke="#FFFFFF" strokeWidth="0.8" />
      <circle cx="16" cy="22.5" r="1" fill="#FFFFFF" />

      {/* Node 3: Converged Output Node (Right, radiant) */}
      <circle cx="23.5" cy="16" r="3" fill="#FFFFFF" stroke="#34D399" strokeWidth="1" filter="url(#nodePulse)" />
      <circle cx="23.5" cy="16" r="1.3" fill="#0E5C36" />
    </svg>
  );
};

export const FlowLogo: React.FC<FlowLogoProps> = ({
  size = 28,
  className = "",
  showWordmark = true,
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <FlowLogoMark size={size} />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-lg font-bold tracking-tight text-ink">
              Flow
            </span>
            <span className="rounded bg-brand-green-pale/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-green-deep">
              Agentic
            </span>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground tracking-normal">
            by HexCoded
          </span>
        </div>
      )}
    </div>
  );
};

export default FlowLogo;
