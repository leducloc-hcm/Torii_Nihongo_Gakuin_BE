# NihonGo — Gamified Japanese Learning App

## Full Copilot Implementation Prompt

---

## Project Overview

Build a **Next.js 15 App Router** gamified Japanese language learning app called **NihonGo**. The app has four screens rendered in a single-page shell with a sidebar (desktop) and bottom navigation bar (mobile). All data is static/mock — no backend required. Use **shadcn/ui**, **Tailwind CSS v4**, and **Lucide React** icons throughout.

---

## Tech Stack

- **Framework:** Next.js 15 App Router (`"use client"` where needed)
- **Styling:** Tailwind CSS v4 with `@theme inline` in `globals.css`
- **UI Components:** shadcn/ui (`Card`, `CardContent`, `Progress`, `cn` utility)
- **Icons:** `lucide-react`
- **Fonts:** `Nunito` (headings + UI) and `Noto Sans JP` (kanji symbols) from `next/font/google`
- **Language:** TypeScript

---

## Step 1 — Project Setup

### Install dependencies

```bash
pnpm add lucide-react
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add card progress
```

### `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Nunito, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const _nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800"],
});
const _notoJp = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-jp",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "NihonGo — Japanese Learning App",
  description:
    "Gamified Japanese language learning with XP, levels, badges, and leaderboards.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${_nunito.variable} ${_notoJp.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

---

## Step 2 — Design Tokens (`app/globals.css`)

Replace the default shadcn CSS variables with this design system. The primary brand color is **indigo-blue**. Custom tokens cover gamification: gold/silver/bronze tiers, XP green, coin yellow, and streak orange.

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(0.97 0.008 250);
  --foreground: oklch(0.18 0.02 265);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.18 0.02 265);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.18 0.02 265);
  --primary: oklch(0.52 0.22 265);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.93 0.03 265);
  --secondary-foreground: oklch(0.3 0.05 265);
  --muted: oklch(0.94 0.01 265);
  --muted-foreground: oklch(0.52 0.04 265);
  --accent: oklch(0.7 0.2 35);
  --accent-foreground: oklch(0.98 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.98 0 0);
  --border: oklch(0.88 0.02 265);
  --input: oklch(0.88 0.02 265);
  --ring: oklch(0.52 0.22 265);
  --radius: 0.75rem;
  /* Gamification tokens */
  --gold: oklch(0.75 0.18 80);
  --silver: oklch(0.72 0.02 265);
  --bronze: oklch(0.62 0.12 55);
  --xp: oklch(0.65 0.2 150);
  --coin: oklch(0.78 0.17 85);
  --streak: oklch(0.68 0.22 35);
}

.dark {
  --background: oklch(0.15 0.025 265);
  --foreground: oklch(0.95 0.01 265);
  --card: oklch(0.2 0.03 265);
  --card-foreground: oklch(0.95 0.01 265);
  --primary: oklch(0.62 0.22 265);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.26 0.04 265);
  --secondary-foreground: oklch(0.9 0.01 265);
  --muted: oklch(0.26 0.04 265);
  --muted-foreground: oklch(0.65 0.04 265);
  --accent: oklch(0.7 0.2 35);
  --accent-foreground: oklch(0.98 0 0);
  --border: oklch(0.28 0.04 265);
  --input: oklch(0.28 0.04 265);
  --ring: oklch(0.62 0.22 265);
}

@theme inline {
  --font-sans: var(--font-nunito), "Nunito", sans-serif;
  --font-mono: "Courier New", monospace;
  --color-gold: var(--gold);
  --color-silver: var(--silver);
  --color-bronze: var(--bronze);
  --color-xp: var(--xp);
  --color-coin: var(--coin);
  --color-streak: var(--streak);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## Step 3 — AnimeFrame Component (`components/anime-frame.tsx`)

An SVG-based profile avatar frame with anime RPG aesthetics. Supports four tiers: `bronze`, `silver`, `gold`, `legendary`. Features:

- Dashed outer ring in tier color
- Inner glow fill behind avatar
- Dark cel-shaded avatar circle with initials
- Diamond-tip corner ornaments at 4 cardinal positions (N/S/E/W)
- 4-point sparkle stars at 45° diagonal positions
- Secondary decorative dashed inner ring
- Level badge pill at bottom-right corner
- Three sizes: `sm` (64px), `md` (96px), `lg` (128px)

```tsx
"use client";

import { cn } from "@/lib/utils";

type FrameTier = "bronze" | "silver" | "gold" | "legendary";

interface AnimeFrameProps {
  initials: string;
  tier: FrameTier;
  level: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const tierConfig: Record<
  FrameTier,
  {
    outerRing: string;
    innerGlow: string;
    cornerColor: string;
    badgeGradient: string;
    badgeText: string;
    sparkleColor: string;
    label: string;
  }
> = {
  bronze: {
    outerRing: "#C07A3A",
    innerGlow: "#E8A86050",
    cornerColor: "#C07A3A",
    badgeGradient: "#C07A3A",
    badgeText: "#fff",
    sparkleColor: "#E8A860",
    label: "Bronze",
  },
  silver: {
    outerRing: "#9EB2CC",
    innerGlow: "#BDD0E850",
    cornerColor: "#8CA4BE",
    badgeGradient: "#8CA4BE",
    badgeText: "#fff",
    sparkleColor: "#BDD0E8",
    label: "Silver",
  },
  gold: {
    outerRing: "#D4A017",
    innerGlow: "#F5D06050",
    cornerColor: "#D4A017",
    badgeGradient: "#D4A017",
    badgeText: "#fff",
    sparkleColor: "#F5D060",
    label: "Gold",
  },
  legendary: {
    outerRing: "#8B5CF6",
    innerGlow: "#C084FC50",
    cornerColor: "#8B5CF6",
    badgeGradient: "#8B5CF6",
    badgeText: "#fff",
    sparkleColor: "#C084FC",
    label: "Legend",
  },
};

const sizeConfig = {
  sm: { frame: 64, avatar: 40, badge: 20, initials: 13 },
  md: { frame: 96, avatar: 62, badge: 26, initials: 18 },
  lg: { frame: 128, avatar: 84, badge: 32, initials: 22 },
};

export function AnimeFrame({
  initials,
  tier,
  level,
  size = "md",
  className,
}: AnimeFrameProps) {
  const c = tierConfig[tier];
  const s = sizeConfig[size];
  const cx = s.frame / 2;
  const cy = s.frame / 2;
  const outerR = s.frame / 2 - 2;
  const innerR = s.avatar / 2;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
      style={{ width: s.frame, height: s.frame }}
    >
      <svg
        width={s.frame}
        height={s.frame}
        viewBox={`0 0 ${s.frame} ${s.frame}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer glow ring */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          stroke={c.outerRing}
          strokeWidth="2.5"
          strokeDasharray="6 3"
          opacity="0.7"
        />
        {/* Inner glow fill */}
        <circle cx={cx} cy={cy} r={innerR + 6} fill={c.innerGlow} />
        {/* Avatar circle */}
        <circle cx={cx} cy={cy} r={innerR} fill="#1e1e2e" />
        <circle
          cx={cx}
          cy={cy}
          r={innerR + 2}
          stroke={c.outerRing}
          strokeWidth="2"
          fill="none"
        />

        {/* Diamond corner ornaments (N/S/E/W) */}
        {(
          [
            [cx, cy - outerR + 4, 0],
            [cx, cy + outerR - 4, 180],
            [cx - outerR + 4, cy, 270],
            [cx + outerR - 4, cy, 90],
          ] as [number, number, number][]
        ).map(([ox, oy, rot], i) => (
          <g key={i} transform={`translate(${ox},${oy}) rotate(${rot})`}>
            <polygon
              points="0,-6 4,0 0,6 -4,0"
              fill={c.cornerColor}
              opacity="0.9"
            />
            <polygon points="0,-4 2,0 0,4 -2,0" fill="#fff" opacity="0.35" />
          </g>
        ))}

        {/* Sparkle stars at 45°/135°/225°/315° */}
        {[45, 135, 225, 315].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const sx = cx + (outerR - 8) * Math.cos(rad);
          const sy = cy + (outerR - 8) * Math.sin(rad);
          const st = i % 2 === 0 ? 4 : 3;
          return (
            <g key={`sp-${i}`} transform={`translate(${sx},${sy})`}>
              <line
                x1={-st}
                y1="0"
                x2={st}
                y2="0"
                stroke={c.sparkleColor}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="0"
                y1={-st}
                x2="0"
                y2={st}
                stroke={c.sparkleColor}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1={-st * 0.7}
                y1={-st * 0.7}
                x2={st * 0.7}
                y2={st * 0.7}
                stroke={c.sparkleColor}
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.6"
              />
              <line
                x1={st * 0.7}
                y1={-st * 0.7}
                x2={-st * 0.7}
                y2={st * 0.7}
                stroke={c.sparkleColor}
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.6"
              />
            </g>
          );
        })}

        {/* Inner decorative dashed ring */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR - 7}
          stroke={c.outerRing}
          strokeWidth="1"
          strokeDasharray="2 8"
          opacity="0.4"
          fill="none"
        />

        {/* Initials */}
        <text
          x={cx}
          y={cy + s.initials * 0.38}
          textAnchor="middle"
          fill="white"
          fontSize={s.initials}
          fontWeight="800"
          fontFamily="Nunito, sans-serif"
          letterSpacing="1"
        >
          {initials}
        </text>
      </svg>

      {/* Level badge */}
      <div
        className="absolute flex items-center justify-center rounded-full font-extrabold shadow-lg border-2 border-background"
        style={{
          width: s.badge,
          height: s.badge,
          bottom: 0,
          right: 0,
          background: c.badgeGradient,
          color: c.badgeText,
          fontSize: s.badge * 0.38,
        }}
      >
        {level}
      </div>
    </div>
  );
}
```

---

## Step 4 — AnimeBadge Component (`components/anime-badge.tsx`)

An SVG hexagon badge with anime cel-shading. Four rarity tiers: `common` (gray), `uncommon` (green), `rare` (indigo), `legendary` (gold/amber). Features:

- Hexagon outer + inner shape with bold border
- Dark cel-shaded inner fill with shine overlay (top-left)
- Kanji/symbol text centered using `Noto Sans JP`
- Cross/sparkle stars at alternate hex vertices for uncommon+
- Crown arc decoration with dots at the top for legendary only
- Grayscale + opacity reduction when `earned={false}`
- Lock icon (not earned) or checkmark dot (earned) at bottom-right
- `AnimeBadgeRarityPill` helper component for rarity label chips

```tsx
"use client";

import { cn } from "@/lib/utils";

export type BadgeRarity = "common" | "uncommon" | "rare" | "legendary";

interface AnimeBadgeProps {
  symbol: string; // kanji character displayed in center
  rarity: BadgeRarity;
  earned: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const rarityConfig: Record<
  BadgeRarity,
  {
    outerColor: string;
    midColor: string;
    innerColor: string;
    glowColor: string;
    shineColor: string;
    textColor: string;
    starColor: string;
    label: string;
    labelBg: string;
    labelText: string;
  }
> = {
  common: {
    outerColor: "#6B7280",
    midColor: "#9CA3AF",
    innerColor: "#1e2030",
    glowColor: "#9CA3AF30",
    shineColor: "#ffffff15",
    textColor: "#E5E7EB",
    starColor: "#D1D5DB",
    label: "Common",
    labelBg: "bg-muted",
    labelText: "text-muted-foreground",
  },
  uncommon: {
    outerColor: "#22C55E",
    midColor: "#4ADE80",
    innerColor: "#052e16",
    glowColor: "#22C55E30",
    shineColor: "#ffffff20",
    textColor: "#BBF7D0",
    starColor: "#86EFAC",
    label: "Uncommon",
    labelBg: "bg-emerald-500/15",
    labelText: "text-emerald-600",
  },
  rare: {
    outerColor: "#6366F1",
    midColor: "#818CF8",
    innerColor: "#1e1b4b",
    glowColor: "#6366F130",
    shineColor: "#ffffff20",
    textColor: "#C7D2FE",
    starColor: "#A5B4FC",
    label: "Rare",
    labelBg: "bg-indigo-500/15",
    labelText: "text-indigo-600",
  },
  legendary: {
    outerColor: "#D97706",
    midColor: "#FCD34D",
    innerColor: "#1c1008",
    glowColor: "#F59E0B50",
    shineColor: "#ffffff30",
    textColor: "#FEF3C7",
    starColor: "#FDE68A",
    label: "Legendary",
    labelBg: "bg-amber-500/15",
    labelText: "text-amber-600",
  },
};

const sizeMap = { sm: 56, md: 80, lg: 112 };

export function AnimeBadge({
  symbol,
  rarity,
  earned,
  size = "md",
  className,
}: AnimeBadgeProps) {
  const c = rarityConfig[rarity];
  const dim = sizeMap[size];
  const cx = dim / 2;
  const cy = dim / 2;
  const outerR = dim / 2 - 2;
  const hexR = outerR - 4;
  const innerHexR = hexR - 8;
  const symbolSize = dim * 0.3;

  // Build hexagon point strings
  const hexPoints = Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 - 90) * (Math.PI / 180);
    return `${cx + hexR * Math.cos(a)},${cy + hexR * Math.sin(a)}`;
  }).join(" ");

  const innerHexPoints = Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 - 90) * (Math.PI / 180);
    return `${cx + innerHexR * Math.cos(a)},${cy + innerHexR * Math.sin(a)}`;
  }).join(" ");

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        !earned && "opacity-40 grayscale",
        className,
      )}
      style={{ width: dim, height: dim }}
    >
      <svg
        width={dim}
        height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Glow bg */}
        <circle cx={cx} cy={cy} r={outerR} fill={c.glowColor} />
        {/* Outer hex */}
        <polygon points={hexPoints} fill={c.outerColor} />
        <polygon
          points={hexPoints}
          fill="none"
          stroke={c.midColor}
          strokeWidth="1.5"
        />
        {/* Inner hex */}
        <polygon points={innerHexPoints} fill={c.innerColor} />
        {/* Shine top-left cel highlight */}
        <polygon
          points={innerHexPoints}
          fill={c.shineColor}
          style={{ clipPath: "inset(0 50% 50% 0)" }}
        />

        {/* Kanji symbol */}
        <text
          x={cx}
          y={cy + symbolSize * 0.38}
          textAnchor="middle"
          fill={c.textColor}
          fontSize={symbolSize}
          fontWeight="900"
          fontFamily="Noto Sans JP, sans-serif"
          opacity={earned ? 1 : 0.5}
        >
          {symbol}
        </text>

        {/* Stars at alternate hex vertices for uncommon+ */}
        {rarity !== "common" &&
          [0, 2, 4].map((i) => {
            const a = (i * 60 - 90) * (Math.PI / 180);
            const sx = cx + (hexR + 1) * Math.cos(a);
            const sy = cy + (hexR + 1) * Math.sin(a);
            const st = rarity === "legendary" ? 3.5 : 2.5;
            return (
              <g key={i} transform={`translate(${sx},${sy})`}>
                <line
                  x1={-st}
                  y1="0"
                  x2={st}
                  y2="0"
                  stroke={c.starColor}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="0"
                  y1={-st}
                  x2="0"
                  y2={st}
                  stroke={c.starColor}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

        {/* Legendary crown arc */}
        {rarity === "legendary" && (
          <>
            <path
              d={`M ${cx - innerHexR * 0.6} ${cy - innerHexR * 0.75} L ${cx} ${cy - innerHexR * 0.9} L ${cx + innerHexR * 0.6} ${cy - innerHexR * 0.75}`}
              stroke={c.starColor}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
            {[cx - innerHexR * 0.6, cx, cx + innerHexR * 0.6].map((px, i) => (
              <circle
                key={i}
                cx={px}
                cy={i === 1 ? cy - innerHexR * 0.9 : cy - innerHexR * 0.75}
                r="1.5"
                fill={c.starColor}
                opacity="0.9"
              />
            ))}
          </>
        )}

        {/* Lock when not earned */}
        {!earned && (
          <g transform={`translate(${cx - 6}, ${cy + innerHexR * 0.45})`}>
            <rect
              x="0"
              y="4"
              width="12"
              height="9"
              rx="2"
              fill={c.outerColor}
              opacity="0.6"
            />
            <path
              d="M2 4 Q2 0 6 0 Q10 0 10 4"
              stroke={c.outerColor}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              opacity="0.6"
            />
          </g>
        )}

        {/* Check when earned */}
        {earned && (
          <>
            <circle
              cx={cx + innerHexR * 0.62}
              cy={cy + innerHexR * 0.62}
              r={dim * 0.1}
              fill={c.outerColor}
            />
            <path
              d={`M ${cx + innerHexR * 0.62 - dim * 0.055} ${cy + innerHexR * 0.62}
                  L ${cx + innerHexR * 0.62 - dim * 0.015} ${cy + innerHexR * 0.62 + dim * 0.04}
                  L ${cx + innerHexR * 0.62 + dim * 0.055} ${cy + innerHexR * 0.62 - dim * 0.04}`}
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        )}
      </svg>
    </div>
  );
}

export function AnimeBadgeRarityPill({ rarity }: { rarity: BadgeRarity }) {
  const c = rarityConfig[rarity];
  return (
    <span
      className={cn(
        "text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize",
        c.labelBg,
        c.labelText,
      )}
    >
      {c.label}
    </span>
  );
}
```

---

## Step 5 — Navigation Shell (`components/nav-bar.tsx`)

Fixed bottom bar on mobile, fixed left sidebar (w-64) on desktop (`md:`). Nav items: Dashboard, Leaderboard, Profile, Achievements. Desktop sidebar shows logo at top and `AnimeFrame` user mini-profile at bottom.

```tsx
"use client";

import { LayoutDashboard, Trophy, User, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimeFrame } from "@/components/anime-frame";

type Screen = "dashboard" | "leaderboard" | "profile" | "achievements";

interface NavBarProps {
  active: Screen;
  onNavigate: (screen: Screen) => void;
}

const navItems = [
  { id: "dashboard" as Screen, label: "Dashboard", icon: LayoutDashboard },
  { id: "leaderboard" as Screen, label: "Leaderboard", icon: Trophy },
  { id: "profile" as Screen, label: "Profile", icon: User },
  { id: "achievements" as Screen, label: "Achievements", icon: Star },
];

export function NavBar({ active, onNavigate }: NavBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border
                    md:top-0 md:bottom-auto md:left-0 md:w-64 md:h-full md:border-t-0 md:border-r md:flex md:flex-col"
    >
      {/* Logo — desktop only */}
      <div className="hidden md:flex items-center gap-3 px-6 py-6 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">日</span>
        </div>
        <div>
          <p className="font-extrabold text-foreground text-lg leading-none">
            NihonGo
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">Learn Japanese</p>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex flex-row md:flex-col md:flex-1 md:px-3 md:py-4 md:gap-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex-1 md:flex-none flex flex-col md:flex-row items-center gap-1 md:gap-3",
                "py-3 px-2 md:px-4 rounded-xl transition-all duration-200 text-xs md:text-sm font-semibold",
                isActive
                  ? "text-primary-foreground bg-primary shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* User mini — desktop only */}
      <div className="hidden md:flex items-center gap-3 px-4 py-4 border-t border-border">
        <AnimeFrame initials="YK" tier="gold" level={14} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm leading-none truncate">
            Yuki Kaneko
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">Lv 14 · N4</p>
        </div>
      </div>
    </nav>
  );
}
```

---

## Step 6 — Main Page Shell (`app/page.tsx`)

Single-page app with client-side screen switching. Mobile top bar shows logo + current screen title. Content max-width 2xl, centered.

```tsx
"use client";

import { useState } from "react";
import { NavBar } from "@/components/nav-bar";
import { DashboardScreen } from "@/components/dashboard-screen";
import { LeaderboardScreen } from "@/components/leaderboard-screen";
import { ProfileScreen } from "@/components/profile-screen";
import { AchievementBankScreen } from "@/components/achievement-bank-screen";

type Screen = "dashboard" | "leaderboard" | "profile" | "achievements";

export default function Home() {
  const [activeScreen, setActiveScreen] = useState<Screen>("dashboard");

  const screenTitles: Record<Screen, string> = {
    dashboard: "Dashboard",
    leaderboard: "Leaderboard",
    profile: "Profile",
    achievements: "Achievements",
  };

  const screens: Record<Screen, React.ReactNode> = {
    dashboard: <DashboardScreen />,
    leaderboard: <LeaderboardScreen />,
    profile: <ProfileScreen />,
    achievements: <AchievementBankScreen />,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">
              日
            </span>
          </div>
          <span className="font-extrabold text-foreground text-base">
            NihonGo
          </span>
        </div>
        <span className="text-sm font-semibold text-muted-foreground">
          {screenTitles[activeScreen]}
        </span>
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
          YK
        </div>
      </header>

      <div className="md:flex md:min-h-screen">
        <NavBar active={activeScreen} onNavigate={setActiveScreen} />
        <main className="flex-1 md:ml-64 pb-24 md:pb-0">
          <div className="max-w-2xl mx-auto px-4 pt-6 md:pt-8 md:px-8">
            {screens[activeScreen]}
          </div>
        </main>
      </div>
    </div>
  );
}
```

---

## Step 7 — Dashboard Screen (`components/dashboard-screen.tsx`)

**Data (static mock):**

- User: Yuki Kaneko, Level 14, JLPT N4, 3420/4000 XP, 12-day streak, 1240 coins
- 5 daily activities: Attend Class, Homework, Speaking, Mock Exam, Listening — first 2 are done
- 4 recent badges using `AnimeBadge` (漢 uncommon, 火 common, 話 rare, 聴 legendary)
- Weekly XP goal: 580/700 (83%)

**Layout (top to bottom):**

1. Greeting row + coin display chip
2. Level/XP card — full-width, `bg-primary text-primary-foreground`, N4 badge, XP progress bar
3. Stats row: 3 equal cards — Streak (flame icon), XP This Week (zap icon), Coins (coins icon)
4. Today's Activities list — each row is a Card with icon, label, XP reward pill, checkmark on done
5. Recent Badges — 4-col grid of `AnimeBadge size="sm"` with name below
6. Weekly XP Goal — `Progress` component

---

## Step 8 — Leaderboard Screen (`components/leaderboard-screen.tsx`)

**Data (static mock — 10 players):**

```ts
const players = [
  {
    rank: 1,
    name: "Hana Tanaka",
    level: 18,
    coins: 2850,
    tier: "gold",
    initials: "HT",
    change: "+2",
  },
  {
    rank: 2,
    name: "Ryuu Sato",
    level: 17,
    coins: 2610,
    tier: "gold",
    initials: "RS",
    change: "-1",
  },
  {
    rank: 3,
    name: "Mei Yamamoto",
    level: 16,
    coins: 2430,
    tier: "gold",
    initials: "MY",
    change: "+1",
  },
  {
    rank: 4,
    name: "Yuki Kaneko",
    level: 14,
    coins: 1240,
    tier: "silver",
    initials: "YK",
    change: "0",
    isMe: true,
  },
  {
    rank: 5,
    name: "Kenji Ito",
    level: 13,
    coins: 1190,
    tier: "silver",
    initials: "KI",
    change: "+3",
  },
  {
    rank: 6,
    name: "Sakura Ohe",
    level: 12,
    coins: 1050,
    tier: "silver",
    initials: "SO",
    change: "-2",
  },
  {
    rank: 7,
    name: "Taro Nishida",
    level: 11,
    coins: 940,
    tier: "bronze",
    initials: "TN",
    change: "+1",
  },
  {
    rank: 8,
    name: "Aoi Kimura",
    level: 10,
    coins: 870,
    tier: "bronze",
    initials: "AK",
    change: "-1",
  },
  {
    rank: 9,
    name: "Ren Fujii",
    level: 9,
    coins: 750,
    tier: "bronze",
    initials: "RF",
    change: "0",
  },
  {
    rank: 10,
    name: "Nana Hayashi",
    level: 8,
    coins: 620,
    tier: "bronze",
    initials: "NH",
    change: "+2",
  },
];
```

**Layout:**

1. Header + Share button
2. Weekly / Monthly tab toggle (pill style)
3. Tier legend row (3 colored dots)
4. Top-3 podium: arrange as [2nd, 1st, 3rd], each column has `AnimeFrame size="sm"`, name, coins. Podium block heights: 1st=h-28, 2nd=h-20, 3rd=h-16. Background uses tier color tokens.
5. Ranks 4-10 as Card rows: rank number, `AnimeFrame size="sm"`, name, level, tier badge pill, coins. The player `isMe: true` gets `ring-2 ring-primary` and a "YOU" pill.

---

## Step 9 — Profile Screen (`components/profile-screen.tsx`)

**Layout:**

1. Profile header: `AnimeFrame size="lg"` tier="gold" + name + username + JLPT N4 + Gold Tier pills + Share button
2. 2x2 stats grid: Streak, Total XP, Coins Earned, Badges Earned
3. Weekly Activity bar chart (no library — custom div bars with `%` height animation, 7-day data)
4. JLPT Journey: 5 level cards (N5=completed 100%, N4=in-progress 68%, N3/N2/N1=locked 0%). Use `Progress` component. Locked items have `opacity-50`.
5. Badges 2-col grid: use `AnimeBadge size="md"` + `AnimeBadgeRarityPill` + name + desc. Locked badges have `opacity-50`.

**Mock data:**

```ts
const jlptLevels = [
  { level: "N5", status: "completed", score: 100 },
  { level: "N4", status: "in-progress", score: 68 },
  { level: "N3", status: "locked", score: 0 },
  { level: "N2", status: "locked", score: 0 },
  { level: "N1", status: "locked", score: 0 },
];

const badges = [
  {
    symbol: "漢",
    name: "Kanji Master",
    desc: "Memorized 100 Kanji",
    earned: true,
    rarity: "uncommon",
  },
  {
    symbol: "火",
    name: "7-Day Streak",
    desc: "Studied 7 days straight",
    earned: true,
    rarity: "common",
  },
  {
    symbol: "話",
    name: "Speaking Hero",
    desc: "Spoke 10x in class",
    earned: false,
    rarity: "rare",
  },
  {
    symbol: "聴",
    name: "Listening Pro",
    desc: "90% on listening test",
    earned: false,
    rarity: "legendary",
  },
];
```

---

## Step 10 — Achievement Bank Screen (`components/achievement-bank-screen.tsx`)

**Mock data — 10 achievements:**

```ts
const achievements = [
  {
    id: 1,
    symbol: "火",
    name: "7-Day Streak",
    desc: "Study 7 days in a row",
    category: "streak",
    earned: true,
    coins: 50,
    xp: 100,
    rarity: "common",
  },
  {
    id: 2,
    symbol: "炎",
    name: "30-Day Streak",
    desc: "Study 30 days in a row",
    category: "streak",
    earned: false,
    coins: 200,
    xp: 500,
    rarity: "rare",
  },
  {
    id: 3,
    symbol: "字",
    name: "Kanji Starter",
    desc: "Memorize 50 Kanji",
    category: "kanji",
    earned: true,
    coins: 80,
    xp: 150,
    rarity: "common",
  },
  {
    id: 4,
    symbol: "漢",
    name: "Kanji Master",
    desc: "Memorize 100 Kanji",
    category: "kanji",
    earned: true,
    coins: 150,
    xp: 300,
    rarity: "uncommon",
  },
  {
    id: 5,
    symbol: "王",
    name: "Kanji Legend",
    desc: "Memorize 500 Kanji",
    category: "kanji",
    earned: false,
    coins: 500,
    xp: 1000,
    rarity: "legendary",
  },
  {
    id: 6,
    symbol: "声",
    name: "First Word",
    desc: "Speak in class for the first time",
    category: "speaking",
    earned: true,
    coins: 20,
    xp: 40,
    rarity: "common",
  },
  {
    id: 7,
    symbol: "話",
    name: "Speaking Hero",
    desc: "Speak 10 times in class",
    category: "speaking",
    earned: false,
    coins: 100,
    xp: 200,
    rarity: "uncommon",
  },
  {
    id: 8,
    symbol: "聴",
    name: "Listening Pro",
    desc: "Score 90%+ on listening test",
    category: "listening",
    earned: false,
    coins: 120,
    xp: 250,
    rarity: "rare",
  },
  {
    id: 9,
    symbol: "完",
    name: "Perfect Score",
    desc: "Get 100% on a mock exam",
    category: "exam",
    earned: false,
    coins: 300,
    xp: 600,
    rarity: "legendary",
  },
  {
    id: 10,
    symbol: "卒",
    name: "N5 Graduate",
    desc: "Complete JLPT N5 level",
    category: "exam",
    earned: true,
    coins: 250,
    xp: 500,
    rarity: "rare",
  },
];
```

**Layout:**

1. Header
2. 3-col summary strip: Earned count, Coins from badges, Completion %
3. Overall progress bar (manual div, not `Progress` component — styled with `bg-primary`)
4. Category filter pills: All, Streak, Kanji, Speaking, Listening, Exam (horizontal scroll on mobile)
5. Achievement list: each row is a Card. Left side: `AnimeBadge size="md"`. Right side: name + `AnimeBadgeRarityPill` + desc + coins/XP row. Far right: "Earned!" green chip or lock icon + "Locked" gray chip.

---

## File Structure Summary

```
app/
  layout.tsx          — Fonts (Nunito + Noto Sans JP), metadata
  globals.css         — Tailwind v4 @theme tokens, gamification CSS vars
  page.tsx            — Shell with NavBar + 4 screen switcher

components/
  anime-frame.tsx     — SVG profile frame with tier system
  anime-badge.tsx     — SVG hexagon badge with rarity system
  nav-bar.tsx         — Sidebar (desktop) + bottom bar (mobile)
  dashboard-screen.tsx
  leaderboard-screen.tsx
  profile-screen.tsx
  achievement-bank-screen.tsx
```

---

## Key Design Rules

1. **Colors:** Only use design tokens — never hardcode `text-white`, `bg-white`, `bg-black`. Use `text-foreground`, `bg-card`, `text-primary`, etc.
2. **Custom tokens:** Access gamification colors via `text-[color:var(--gold)]`, `bg-[color:var(--xp)]/20`, `text-[color:var(--streak)]`, etc.
3. **Spacing:** Use Tailwind spacing scale only — never arbitrary values like `p-[16px]`.
4. **Layout:** Flexbox first. Grid only for 2D (stats rows, badge grids). No floats, no absolute positioning except the level badge on `AnimeFrame`.
5. **Fonts:** Apply via `font-sans` class (maps to Nunito). Kanji text uses `fontFamily: "Noto Sans JP, sans-serif"` inline in SVG.
6. **Responsive:** Mobile-first. Use `md:` prefix for sidebar layout.
7. **No external image URLs** — all visuals are SVG, icons, or text.
