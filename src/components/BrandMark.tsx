export default function BrandMark({ size = 28 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="#111" />
    <path d="M7 21.5 12.5 16l4 3.5L25 10.5" fill="none" stroke="#b7f36b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="25" cy="10.5" r="2.4" fill="#b7f36b" />
  </svg>;
}
