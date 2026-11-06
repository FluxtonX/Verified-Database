import type { CSSProperties } from "react";

type IconName = "search" | "plus" | "chevron" | "heart" | "comment" | "share" | "shield" | "megaphone" | "warning" | "close";
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
};
export function Icon({ name, size = 18, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}
