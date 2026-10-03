import type { SVGProps } from "react";

/** SF Symbols–style line icons, drawn on a 24px grid with round caps. */
const PATHS = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  close: <path d="M7 7l10 10M17 7 7 17" />,
  back: <path d="M15 5l-7 7 7 7" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  down: <path d="m7 10 5 5 5-5" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />,
  share: <><path d="M12 15V3.5M8 7.5l4-4 4 4" /><path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5H16" /></>,
  directions: <path d="M12.6 3.3 20.7 11.4a.9.9 0 0 1 0 1.2l-8.1 8.1a.9.9 0 0 1-1.2 0l-8.1-8.1a.9.9 0 0 1 0-1.2l8.1-8.1a.9.9 0 0 1 1.2 0ZM9 14.5v-2a1.5 1.5 0 0 1 1.5-1.5H15m-2-2 2 2-2 2" />,
  pin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="3" /><path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5" /></>,
  access: <><circle cx="12" cy="4.8" r="1.6" /><path d="M5.5 8.5c2.2.6 4.3.9 6.5.9s4.3-.3 6.5-.9M12 9.4V14m0 0-3 6m3-6 3 6" /></>,
  people: <><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9.5" r="2.3" /><path d="M16 14.2a4.5 4.5 0 0 1 5 4.3" /></>,
  sparkle: <path d="M12 3.5c.5 4.3 2.2 6 6.5 6.5-4.3.5-6 2.2-6.5 6.5-.5-4.3-2.2-6-6.5-6.5 4.3-.5 6-2.2 6.5-6.5ZM18.5 15.5c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5Z" />,
  install: <><rect x="5" y="3.5" width="14" height="17" rx="3.5" /><path d="M12 8v6.5M9.2 11.8 12 14.6l2.8-2.8" /></>,
  plusSquare: <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8.5v7M8.5 12h7" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5Z" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.2" /></>,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 22,
  filled = false,
  strokeWidth = 1.9,
  ...rest
}: { name: IconName; size?: number; filled?: boolean; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
