import { z } from "zod";

// ── Kanji data bundled in-service (no external call needed) ──
// Curated list per JLPT level: character, meanings, kunyomi/onyomi readings
export interface KanjiEntry {
  character: string;
  meanings: string[];
  readings: string[];
  jlpt: string;
}

export const KANJI_POOL: KanjiEntry[] = [
  // N5
  { character: "日", meanings: ["day", "sun"], readings: ["にち", "ひ"], jlpt: "N5" },
  { character: "月", meanings: ["moon", "month"], readings: ["げつ", "つき"], jlpt: "N5" },
  { character: "火", meanings: ["fire"], readings: ["か", "ひ"], jlpt: "N5" },
  { character: "水", meanings: ["water"], readings: ["すい", "みず"], jlpt: "N5" },
  { character: "木", meanings: ["tree", "wood"], readings: ["もく", "き"], jlpt: "N5" },
  { character: "金", meanings: ["gold", "money"], readings: ["きん", "かね"], jlpt: "N5" },
  { character: "土", meanings: ["earth", "soil"], readings: ["ど", "つち"], jlpt: "N5" },
  { character: "山", meanings: ["mountain"], readings: ["さん", "やま"], jlpt: "N5" },
  { character: "川", meanings: ["river"], readings: ["かわ"], jlpt: "N5" },
  { character: "人", meanings: ["person"], readings: ["じん", "ひと"], jlpt: "N5" },
  { character: "口", meanings: ["mouth"], readings: ["こう", "くち"], jlpt: "N5" },
  { character: "手", meanings: ["hand"], readings: ["しゅ", "て"], jlpt: "N5" },
  { character: "目", meanings: ["eye"], readings: ["もく", "め"], jlpt: "N5" },
  { character: "耳", meanings: ["ear"], readings: ["じ", "みみ"], jlpt: "N5" },
  { character: "足", meanings: ["foot", "leg"], readings: ["そく", "あし"], jlpt: "N5" },
  // N4
  { character: "家", meanings: ["house", "family"], readings: ["か", "いえ"], jlpt: "N4" },
  { character: "駅", meanings: ["station"], readings: ["えき"], jlpt: "N4" },
  { character: "電", meanings: ["electricity"], readings: ["でん"], jlpt: "N4" },
  { character: "話", meanings: ["talk", "story"], readings: ["わ", "はなし"], jlpt: "N4" },
  { character: "食", meanings: ["eat", "food"], readings: ["しょく", "た"], jlpt: "N4" },
  { character: "飲", meanings: ["drink"], readings: ["いん", "の"], jlpt: "N4" },
  { character: "読", meanings: ["read"], readings: ["どく", "よ"], jlpt: "N4" },
  { character: "書", meanings: ["write"], readings: ["しょ", "か"], jlpt: "N4" },
  { character: "見", meanings: ["see", "look"], readings: ["けん", "み"], jlpt: "N4" },
  { character: "聞", meanings: ["hear", "listen"], readings: ["ぶん", "き"], jlpt: "N4" },
  // N3
  { character: "意", meanings: ["meaning", "mind"], readings: ["い"], jlpt: "N3" },
  { character: "味", meanings: ["flavor", "meaning"], readings: ["み", "あじ"], jlpt: "N3" },
  { character: "仕", meanings: ["work", "serve"], readings: ["し"], jlpt: "N3" },
  { character: "事", meanings: ["matter", "thing"], readings: ["じ", "こと"], jlpt: "N3" },
  { character: "思", meanings: ["think"], readings: ["し", "おも"], jlpt: "N3" },
  { character: "知", meanings: ["know"], readings: ["ち", "し"], jlpt: "N3" },
  { character: "持", meanings: ["hold", "have"], readings: ["じ", "も"], jlpt: "N3" },
  { character: "使", meanings: ["use"], readings: ["し", "つか"], jlpt: "N3" },
  { character: "来", meanings: ["come"], readings: ["らい", "き"], jlpt: "N3" },
  { character: "言", meanings: ["say", "word"], readings: ["げん", "い"], jlpt: "N3" },
  // N2
  { character: "経", meanings: ["pass", "manage", "sutra"], readings: ["けい", "へ"], jlpt: "N2" },
  { character: "済", meanings: ["settle", "finish"], readings: ["さい", "す"], jlpt: "N2" },
  { character: "続", meanings: ["continue"], readings: ["ぞく", "つづ"], jlpt: "N2" },
  { character: "確", meanings: ["certain", "confirm"], readings: ["かく"], jlpt: "N2" },
  { character: "準", meanings: ["prepare", "quasi"], readings: ["じゅん"], jlpt: "N2" },
  { character: "関", meanings: ["relation", "barrier"], readings: ["かん", "せき"], jlpt: "N2" },
  { character: "際", meanings: ["occasion", "edge"], readings: ["さい", "きわ"], jlpt: "N2" },
  { character: "場", meanings: ["place", "field"], readings: ["じょう", "ば"], jlpt: "N2" },
  { character: "合", meanings: ["fit", "combine"], readings: ["ごう", "あ"], jlpt: "N2" },
  { character: "対", meanings: ["versus", "opposite"], readings: ["たい", "つい"], jlpt: "N2" },
  // N1
  { character: "憂", meanings: ["melancholy", "grief"], readings: ["ゆう", "うれ"], jlpt: "N1" },
  { character: "醸", meanings: ["brew", "cause"], readings: ["じょう", "かも"], jlpt: "N1" },
  { character: "鬱", meanings: ["depression", "dense"], readings: ["うつ"], jlpt: "N1" },
  { character: "繊", meanings: ["slender", "fiber"], readings: ["せん"], jlpt: "N1" },
  { character: "邪", meanings: ["wicked", "wrong"], readings: ["じゃ", "よこ"], jlpt: "N1" },
  { character: "渦", meanings: ["whirlpool"], readings: ["か", "うず"], jlpt: "N1" },
  { character: "刹", meanings: ["temple", "moment"], readings: ["せつ", "さつ"], jlpt: "N1" },
  { character: "魁", meanings: ["leader", "forerunner"], readings: ["かい", "さきがけ"], jlpt: "N1" },
  { character: "翻", meanings: ["flip", "translate"], readings: ["ほん", "ひるがえ"], jlpt: "N1" },
  { character: "凛", meanings: ["cold", "dignified"], readings: ["りん"], jlpt: "N1" },
];

// ── Domain types ──
export interface BossQuestion {
  sessionId: number;
  roundIndex: number;
  kanjiCharacter: string;
  questionType: "meaning" | "reading" | "fill_blank";
  prompt: string;
  options: string[];
  correctAnswer: string;
  timeLimit: number;
  bossSkillUsed: string | null;
  isEnraged: boolean;
  expiresAt: number; // unix ms
}

export interface SessionState {
  currentHp: number;
  maxHp: number;
  correctStreak: number;
  wrongCount: number;
  adaptiveDifficulty: number;
  enraged: boolean;
  status: "IN_PROGRESS" | "WIN" | "LOSE";
}

export interface SubmitAnswerResult {
  correct: boolean;
  correctAnswer: string;
  damageDone: number;
  timeLeft: number;
  newHp: number;
  newStreak: number;
  battleEnded: boolean;
  battleStatus: "IN_PROGRESS" | "WIN" | "LOSE";
  xpEarned: number;
  coinsEarned: number;
  isEnraged: boolean;
}
