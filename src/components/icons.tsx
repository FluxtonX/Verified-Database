import type { CSSProperties } from "react";

export type IconName = "search" | "plus" | "chevron" | "heart" | "comment" | "share" | "shield" | "megaphone" | "warning" | "close" | "check" | "chevrons" | "external" | "inbox" | "building" | "profile" | "settings" | "bulb" | "logout" | "filter" | "mail";
const paths: Record<IconName, React.ReactNode> = {
  search: <><circle cx="10.8" cy="10.8" r="7.8"/><path d="m16.5 16.5 4.5 4.5"/></>,
  plus: <path d="M12 4v16M4 12h16"/>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
  comment: <path d="M21 11.5a9 9 0 0 1-9 9 10 10 0 0 1-4-.9L3 21l1.4-4.7A9 9 0 1 1 21 11.5Z"/>,
  share: <><path d="M12 15V2m-5 5 5-5 5 5M5 12v9h14v-9"/></>,
  shield: <><path d="m12 2 9 4v5c0 5-4 9-9 11-5-2-9-6-9-11V6Z"/><path d="m8 11 3 3 5-6"/></>,
  megaphone: <><path d="m3 8 16-5v18L3 16V8Z"/><path d="m6 17 2 5h4l-2-6M21 9v6"/></>,
  warning: <><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  check: <path d="m4 12 5 5L20 6"/>,
  chevrons: <path d="m7 9 5-5 5 5M7 15l5 5 5-5"/>,
  external: <path d="M13 5h6v6m0-6-9 9m7-1v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"/>,
  inbox: <path d="M5 19 2 22V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2ZM7 11h.01M12 11h.01M17 11h.01"/>,
  building: <path d="M3 21h18v-9h-5M7 21V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16M3 21v-9h4m3-5h3m-3 4h3m-3 10v-5h3v5"/>,
  profile: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M6 19a6 6 0 0 1 12 0"/></>,
  settings: <><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M9.5 7H21M3 7h1.5m15 10H21M3 17h11.5"/></>,
  bulb: <path d="M9 18h6m-5 3h4M9 15c0-2-3-2.5-3-6a6 6 0 0 1 12 0c0 3.5-3 4-3 6"/>,
  logout: <path d="M10 5H4v14h6m-1-7h12m-4-4 4 4-4 4"/>,
  filter: <path d="M3 4h18l-7 8v7l-4 2v-9Z"/>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
};
export function Icon({ name, size = 18, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}
