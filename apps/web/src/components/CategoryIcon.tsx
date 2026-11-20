import type { ReactNode } from "react";

interface Props {
  category: string;
  className?: string;
}

/** Icônes SVG inline par catégorie (autorisées par la CSP : ce sont des éléments DOM). */
const ICONS: Record<string, ReactNode> = {
  musique: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  humour: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14s1.3 2 3.5 2 3.5-2 3.5-2" />
      <line x1="9" y1="9.5" x2="9.01" y2="9.5" />
      <line x1="15" y1="9.5" x2="15.01" y2="9.5" />
    </>
  ),
  sport: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </>
  ),
  exposition: (
    <>
      <circle cx="13.5" cy="6.5" r=".6" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="10.5" r=".6" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="7.5" r=".6" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="12.5" r=".6" fill="currentColor" stroke="none" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.28-.44-.65-.44-1.12a1.64 1.64 0 0 1 1.67-1.67h1.99c3.05 0 5.56-2.5 5.56-5.55C22 6.01 17.46 2 12 2z" />
    </>
  ),
  theatre: (
    <>
      <path d="M4 3.5s1.2 1 3.2 1h9.6c2 0 3.2-1 3.2-1V11c0 5.2-3.6 9.5-8 9.5S4 16.2 4 11V3.5z" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
      <path d="M8.8 14.2s1.3 1.8 3.2 1.8 3.2-1.8 3.2-1.8" />
    </>
  ),
};

const FALLBACK = (
  <>
    <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-6z" />
    <path d="M13 5v2" />
    <path d="M13 11v2" />
    <path d="M13 17v2" />
  </>
);

/** Grande icône de catégorie (note de musique, trophée, smiley, palette, masque…). */
export function CategoryIcon({ category, className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {ICONS[category] ?? FALLBACK}
    </svg>
  );
}
