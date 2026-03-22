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

## Step 5 — Navigation Shell (`components/nav-bar.tsx`)

Fixed bottom bar on mobile, fixed left sidebar (w-64) on desktop (`md:`). Nav items: Dashboard, Leaderboard, Profile, Achievements. Desktop sidebar shows logo at top and `AnimeFrame` user mini-profile at bottom.

## Step 6 — Main Page Shell (`app/page.tsx`)

Single-page app with client-side screen switching. Mobile top bar shows logo + current screen title. Content max-width 2xl, centered.

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

Gamification System – Updated Requirements (No Speaking)

1. Core Entities
   ActivityLog
   ActivityLog {
   id: string
   user_id: string
   type: "ATTENDANCE" | "HOMEWORK" | "MOCK_TEST"
   points: number
   created_at: Date
   }
2. Point System
   Rules
   Activity Points
   Attendance +10
   Homework +5
   Mock Test +20
   Logic
   function addPoints(user, activityType):
   points = getPoints(activityType)
   user.exp += points
   user.coins += points
   updateLevel(user)
3. Achievement System
   Updated Achievements
   Name Condition Reward
   🥇 Kanji Master Learn 100 Kanji +100
   🔥 7-day streak 7 consecutive days +50
   🎧 Listening Pro 90% listening score +70
   Updated Entity
   Achievement {
   id: string
   name: string
   description: string
   icon: string
   condition_type: "KANJI" | "STREAK" | "LISTENING"
   condition_value: number
   reward_coins: number
   }
4. Achievement Logic
   function checkAchievements(user):
   for achievement in achievements:
   if conditionMet(user, achievement):
   unlock(achievement)
   user.coins += achievement.reward_coins
5. Removed Components

❌ Removed completely:

Speaking activity (+2 points)
Speaking Hero achievement
Any speaking-related metrics or tracking 6. Copilot Prompt (Updated)
Build a gamification backend system in Node.js with:

- User, ActivityLog, Achievement, Leaderboard models
- Activities: attendance, homework, mock test
- Point system with level progression
- Streak tracking logic
- Achievement unlocking system (kanji, streak, listening)
- Coin earning and spending
- Weekly leaderboard ranking

Use clean architecture and REST API.
Include sample endpoints and services.
