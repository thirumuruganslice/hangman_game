import {useState, useEffect, useCallback, useRef} from "react";
import HangmanCanvas from "./components/HangmanCanvas";
import {getRandomWord, ALPHABET} from "./utils/words";
import {soundManager} from "./utils/sounds";

// ── Emoji constants via unicode escapes ───────────────────────────────────────
const E = {
  eyes: "\u{1F440}",
  skull: "\u{1F480}",
  siren: "\u{1F6A8}",
  sweat: "\u{1F630}",
  grimace: "\u{1F62C}",
  no: "\u{1F645}",
  facepalm: "\u{1F926}",
  meh: "\u{1F611}",
  lol: "\u{1F602}",
  cry: "\u{1F62D}",
  boom: "\u{1F4A5}",
  brain: "\u{1F9E0}",
  dart: "\u{1F3AF}",
  fire: "\u{1F525}",
  check: "\u2705",
  sparkles: "\u2728",
  cool: "\u{1F60E}",
  nail: "\u{1F485}",
  pinch: "\u{1F90C}",
  trophy: "\u{1F3C6}",
  star: "\u{1F31F}",
  goat: "\u{1F410}",
  muscle: "\u{1F4AA}",
  granny: "\u{1F475}",
  confetti: "\u{1F389}",
  streamer: "\u{1F38A}",
  balloon: "\u{1F388}",
  unicorn: "\u{1F984}",
  clover: "\u{1F340}",
  gem: "\u{1F48E}",
  party: "\u{1F973}",
  scream: "\u{1F631}",
  folder: "\u{1F4C2}",
  loud: "\u{1F50A}",
  mute: "\u{1F507}",
  refresh: "\u{1F504}",
  kbd: "\u2328",
  cross: "\u274C",
  gamepad: "\u{1F3AE}",
  star2: "\u2B50",
  comet: "\u{1F4AB}",
  crown: "\u{1F451}",
  rainbow: "\u{1F308}",
  rocket: "\u{1F680}",
  ribbon: "\u{1F397}",
  medal: "\u{1F3C5}",
  hi: "\u{1F44B}",
  clap: "\u{1F44F}",
  bulb: "\u{1F4A1}",
  lock: "\u{1F512}",
  unlock: "\u{1F513}",
  mag: "\u{1F50D}",
  info: "\u2139\uFE0F",
};

const MAX_WRONG = 6;
let _pid = 0;
const newId = () => ++_pid;

const THEME_STORAGE_KEY = "hangman_theme";
const DIAMONDS_STORAGE_KEY = "hangman_diamonds";

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // ignore
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
    ? "dark"
    : "light";
}

function getInitialDiamonds() {
  try {
    const saved = localStorage.getItem(DIAMONDS_STORAGE_KEY);
    if (saved !== null) return parseInt(saved, 10) || 0;
  } catch {
    // ignore
  }
  return 0;
}

// ── Reward tiers ──────────────────────────────────────────────────────────────
const REWARDS = {
  correctLetter: 1, // per correct letter guess
  combo2: 2, // combo x2 bonus
  combo3: 3, // combo x3 bonus
  combo4: 5, // combo x4 bonus
  combo5plus: 8, // combo x5+ bonus
  winGame: 10, // base win reward
  perfectGame: 25, // 0 mistakes bonus
  streakBonus: 5, // per streak level (>=2)
};

// ── Hint system ───────────────────────────────────────────────────────────────
const HINT_COST = 15; // diamonds per hint
const MAX_HINTS_PER_GAME = 3;

// ── Message pools ─────────────────────────────────────────────────────────────
const TAUNTS = [
  "",
  `One wrong already? ${E.eyes}`,
  `Still alive... barely ${E.grimace}`,
  `Your guy is NOT okay ${E.sweat}`,
  `This is getting ugly ${E.skull}`,
  `ONE MORE AND IT'S OVER ${E.siren}`,
  "",
];
const WRONG_MSGS = [
  `Nope! ${E.no}`,
  `Wrong! ${E.facepalm}`,
  `Really?! ${E.meh}`,
  `Are you serious? ${E.lol}`,
  `LOL nope ${E.cry}`,
  `YIKES ${E.grimace}`,
  `Oof ${E.boom}`,
  `Not even close ${E.eyes}`,
  `Big brain moment ${E.brain}`,
];
const CORRECT_MSGS = [
  `Nice! ${E.dart}`,
  `LET'S GO! ${E.fire}`,
  `Genius! ${E.brain}`,
  `Correct! ${E.sparkles}`,
  `Boom! ${E.boom}`,
  `Ohhh yeah! ${E.cool}`,
  `Slaying! ${E.nail}`,
  `Chef's kiss ${E.pinch}`,
];
const COMBO_MSGS = [
  `Combo x2! ${E.fire}`,
  `x3 ON FIRE! ${E.fire}${E.fire}`,
  `x4 UNSTOPPABLE! ${E.star}`,
  `x5 GODLIKE!! ${E.trophy}`,
  `GOAT MODE ${E.goat}`,
];
const WIN_LINES = [
  `You absolute genius! ${E.brain}`,
  `SOLVED IT! Unbeatable! ${E.trophy}`,
  `That was CLEAN! ${E.cool}`,
  `GG EZ no re ${E.muscle}`,
  `Dictionary be scared ${E.scream}`,
  `God-tier vocabulary ${E.crown}`,
  `Even I\u2019m impressed ${E.sparkles}`,
];
const LOSE_LINES = [
  `The hangman sends regards ${E.skull}`,
  `Maybe try an easier word? ${E.grimace}`,
  `RIP to your vocabulary ${E.skull}`,
  `Even my grandma knew this ${E.granny}`,
  `404: Brain Not Found ${E.boom}`,
  `Better luck next lifetime ${E.scream}`,
  `The word was RIGHT THERE ${E.facepalm}`,
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const CONFETTI_EMOJIS = [
  E.confetti,
  E.streamer,
  E.sparkles,
  E.star2,
  E.star,
  E.comet,
  E.balloon,
  E.unicorn,
  E.clover,
  E.gem,
  E.fire,
  E.party,
  E.crown,
  E.rainbow,
  E.ribbon,
];
const SKULL_RAIN = [E.skull, E.grimace, E.scream, E.facepalm, E.boom];

const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

// ── Pre-generated confetti pieces (stable across renders) ─────────────────────
const PIECES_DATA = Array.from({length: 44}, (_, i) => {
  const shapes = ["rect", "circle", "diamond"];
  const colors = [
    "#f97316",
    "#ec4899",
    "#a855f7",
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#84cc16",
    "#06b6d4",
    "#f43f5e",
  ];
  return {
    id: i,
    left: (i * 2.3) % 100,
    delay: (i * 0.065) % 2.8,
    duration: 2.2 + ((i * 0.18) % 2.0),
    color: colors[i % colors.length],
    size: 7 + ((i * 3) % 9),
    shape: shapes[i % 3],
  };
});

// ── Firework particle directions (12 per burst) ───────────────────────────────
const FW_DIRS = Array.from({length: 12}, (_, j) => ({
  dx: Math.cos((j * Math.PI) / 6) * 72,
  dy: Math.sin((j * Math.PI) / 6) * 72,
}));

// ── Star positions for victory glow (stable) ─────────────────────────────────
const STAR_POSITIONS = [
  {top: 8, left: 30},
  {top: 12, left: 62},
  {top: 22, left: 18},
  {top: 20, left: 78},
  {top: 55, left: 8},
  {top: 58, left: 90},
  {top: 72, left: 25},
  {top: 75, left: 70},
  {top: 88, left: 45},
  {top: 40, left: 5},
  {top: 42, left: 93},
  {top: 32, left: 50},
];

function getNewGame() {
  const {word, category, clue} = getRandomWord();
  return {word, category, clue, guessedLetters: new Set()};
}

// ── CSS keyframes ─────────────────────────────────────────────────────────────
const STYLES = `
@keyframes floatUp {
  0%   { opacity:1; transform:translateY(0) scale(1) rotate(0deg); }
  80%  { opacity:.8; }
  100% { opacity:0; transform:translateY(-110px) scale(1.4) rotate(20deg); }
}
@keyframes popIn {
  0%   { transform:scale(0) rotate(-15deg); opacity:0; }
  60%  { transform:scale(1.3) rotate(5deg); opacity:1; }
  100% { transform:scale(1) rotate(0deg); opacity:1; }
}
@keyframes shake {
  0%,100% { transform:translateX(0); }
  15% { transform:translateX(-8px) rotate(-2deg); }
  30% { transform:translateX(8px) rotate(2deg); }
  45% { transform:translateX(-6px); }
  60% { transform:translateX(6px); }
  75% { transform:translateX(-3px); }
}
@keyframes flashRed   { 0%,100%{opacity:0;} 20%{opacity:.10;} 60%{opacity:.06;} }
@keyframes flashGreen { 0%,100%{opacity:0;} 20%{opacity:.07;} 60%{opacity:.04;} }
@keyframes rainbow {
  0%   { background-position:0% 50%; }
  50%  { background-position:100% 50%; }
  100% { background-position:0% 50%; }
}
@keyframes letterPop {
  0%   { transform:scale(0) translateY(10px); }
  70%  { transform:scale(1.25) translateY(-3px); }
  100% { transform:scale(1) translateY(0); }
}
@keyframes comboZoom {
  0%   { transform:scale(0.5); opacity:0; }
  60%  { transform:scale(1.2); opacity:1; }
  100% { transform:scale(1); opacity:0; }
}
@keyframes dangerPulse { 0%,100%{ opacity:1; } 50%{ opacity:.4; } }
@keyframes resultSlideIn {
  0%   { transform:scale(0.92) translateY(24px); opacity:0; filter:blur(4px); }
  60%  { transform:scale(1.01) translateY(-2px); opacity:1; filter:blur(0); }
  100% { transform:scale(1) translateY(0); opacity:1; filter:blur(0); }
}
@keyframes spin      { to { transform:rotate(360deg); } }
@keyframes floatAlt  { 0%{ transform:translateY(0); } 100%{ transform:translateY(-12px); } }

/* ── Victory-specific animations ── */
@keyframes victoryBounce {
  0%   { transform:scale(0) rotate(-90deg); opacity:0; }
  35%  { transform:scale(1.18) rotate(6deg); opacity:1; }
  55%  { transform:scale(0.92) rotate(-3deg); }
  75%  { transform:scale(1.06) rotate(1deg); }
  100% { transform:scale(1) rotate(0deg); }
}
@keyframes trophyFloat {
  0%   { transform:translateY(0) scale(1); }
  100% { transform:translateY(-14px) scale(1.06); }
}
@keyframes shimmer {
  0%   { background-position:-400% center; }
  100% { background-position: 400% center; }
}
@keyframes glowRing {
  0%,100% { box-shadow:0 0 0 2px rgba(251,191,36,0.4), 0 0 20px rgba(245,158,11,0.15), 0 12px 40px rgba(0,0,0,.12); }
  50%     { box-shadow:0 0 0 3px rgba(253,230,138,0.5), 0 0 35px rgba(251,191,36,0.25), 0 12px 45px rgba(0,0,0,.15); }
}
@keyframes badgePop {
  0%   { transform:scale(0) rotate(-20deg); opacity:0; }
  70%  { transform:scale(1.2) rotate(5deg); opacity:1; }
  100% { transform:scale(1) rotate(0deg); }
}
@keyframes fallDown {
  0%   { transform:translateY(-30px) rotate(0deg); opacity:1; }
  80%  { opacity:.8; }
  100% { transform:translateY(102vh) rotate(720deg); opacity:0; }
}
@keyframes sparkleOut {
  0%   { transform:translate(0,0) scale(1); opacity:1; }
  100% { transform:translate(var(--fw-dx),var(--fw-dy)) scale(0); opacity:0; }
}
@keyframes starFloat {
  0%   { transform:scale(0.7) rotate(-10deg); opacity:.5; }
  100% { transform:scale(1.2) rotate(10deg); opacity:1; }
}
@keyframes backdropFade {
  from { opacity:0; backdrop-filter:blur(0); }
  to   { opacity:1; backdrop-filter:blur(12px); }
}
@keyframes loseSlam {
  0%   { transform:scale(1.6) rotate(12deg); opacity:0; filter:blur(6px); }
  50%  { transform:scale(0.95) rotate(-2deg); opacity:1; filter:blur(0); }
  100% { transform:scale(1) rotate(0deg); opacity:1; filter:blur(0); }
}
@keyframes loseShake {
  0%,100% { transform:translateX(0) rotate(0deg); }
  20% { transform:translateX(-10px) rotate(-3deg); }
  40% { transform:translateX(10px) rotate(3deg); }
  60% { transform:translateX(-8px) rotate(-2deg); }
  80% { transform:translateX(8px) rotate(2deg); }
}
@keyframes streakSlide {
  0%   { transform:translateX(60px); opacity:0; }
  60%  { transform:translateX(-5px); opacity:1; }
  100% { transform:translateX(0); opacity:1; }
}
@keyframes diamondPop {
  0%   { transform:scale(0) rotate(-20deg); opacity:0; }
  50%  { transform:scale(1.5) rotate(10deg); opacity:1; }
  100% { transform:scale(1) rotate(0deg); opacity:1; }
}
@keyframes diamondFloat {
  0%   { transform:translateY(0) scale(1); opacity:1; }
  100% { transform:translateY(-40px) scale(1.3); opacity:0; }
}
@keyframes coinShine {
  0%   { background-position:-200% center; }
  100% { background-position:200% center; }
}
@keyframes rewardSlide {
  0%   { transform:translateY(20px) scale(0.8); opacity:0; }
  60%  { transform:translateY(-4px) scale(1.05); opacity:1; }
  100% { transform:translateY(0) scale(1); opacity:1; }
}
@keyframes hintReveal {
  0%   { transform:scale(0) rotate(-30deg); opacity:0; filter:blur(8px); }
  50%  { transform:scale(1.3) rotate(5deg); opacity:1; filter:blur(0); }
  100% { transform:scale(1) rotate(0deg); opacity:1; filter:blur(0); }
}
@keyframes hintGlow {
  0%,100% { box-shadow:0 0 0 0 rgba(168,85,247,0); }
  50%     { box-shadow:0 0 20px 4px rgba(168,85,247,0.4); }
}
@keyframes hintShimmer {
  0%   { background-position:-200% center; }
  100% { background-position:200% center; }
}
@keyframes modalSlideUp {
  0%   { transform:translateY(30px) scale(0.95); opacity:0; }
  100% { transform:translateY(0) scale(1); opacity:1; }
}
@keyframes pulseGlow {
  0%,100% { opacity:0.6; }
  50%     { opacity:1; }
}
@keyframes knifeSlash {
  0%   { transform:scaleX(0) translateX(-50%); opacity:0; }
  30%  { transform:scaleX(1) translateX(0); opacity:1; }
  70%  { transform:scaleX(1) translateX(0); opacity:0.8; }
  100% { transform:scaleX(0) translateX(50%); opacity:0; }
}
@keyframes ropeSnapFlash {
  0%   { opacity:0; }
  15%  { opacity:0.35; }
  40%  { opacity:0.18; }
  100% { opacity:0; }
}
@keyframes freedomDrop {
  0%   { transform:translateY(-24px) scale(0.7) rotate(-15deg); opacity:0; }
  55%  { transform:translateY(4px) scale(1.1) rotate(3deg); opacity:1; }
  100% { transform:translateY(0) scale(1) rotate(0deg); opacity:1; }
}
@keyframes canvasPop {
  0%   { transform:scale(1); }
  40%  { transform:scale(1.03); }
  100% { transform:scale(1); }
}
@keyframes keyPress {
  0%   { transform:translateY(0) scale(1); }
  40%  { transform:translateY(3px) scale(0.93); }
  100% { transform:translateY(0) scale(1); }
}
@keyframes keyPing {
  0%   { box-shadow:0 0 0 0 rgba(99,102,241,0.45); }
  70%  { box-shadow:0 0 0 10px rgba(99,102,241,0.08); }
  100% { box-shadow:0 0 0 16px rgba(99,102,241,0); }
}
@keyframes keyPingDark {
  0%   { box-shadow:0 0 0 0 rgba(129,140,248,0.4); }
  70%  { box-shadow:0 0 0 10px rgba(129,140,248,0.06); }
  100% { box-shadow:0 0 0 16px rgba(129,140,248,0); }
}
@keyframes keyFlash {
  0%   { background-color: rgba(99,102,241,0.18); }
  100% { background-color: transparent; }
}

.keyboard-surface {
  background: linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.92) 100%);
  border: 1px solid rgba(203,213,225,0.6);
  border-radius: 1.25rem;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.9) inset,
    0 20px 50px -12px rgba(15,23,42,0.08),
    0 4px 12px rgba(15,23,42,0.03);
}
.dark .keyboard-surface {
  background: linear-gradient(180deg, rgba(15,23,42,0.85) 0%, rgba(2,6,23,0.7) 100%);
  border: 1px solid rgba(51,65,85,0.5);
  box-shadow:
    0 1px 0 rgba(51,65,85,0.3) inset,
    0 24px 60px -12px rgba(2,6,23,0.5),
    0 4px 12px rgba(0,0,0,0.25);
}

.keycap {
  border-radius: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  position: relative;
  transition:
    transform 100ms cubic-bezier(0.4,0,0.2,1),
    box-shadow 180ms cubic-bezier(0.4,0,0.2,1),
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease;
}
.keycap:active {
  transform: translateY(2px) scale(0.96);
}

.keycap--idle {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #cbd5e1;
  border-bottom: 3px solid #94a3b8;
  color: #1e293b;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.9) inset,
    0 2px 6px rgba(15,23,42,0.06);
}
.keycap--idle:hover {
  background: linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%);
  border-color: #94a3b8;
  border-bottom-color: #64748b;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.9) inset,
    0 4px 12px rgba(15,23,42,0.1);
}
.dark .keycap--idle {
  background: linear-gradient(180deg, rgba(51,65,85,0.7) 0%, rgba(30,41,59,0.8) 100%);
  border: 1px solid rgba(71,85,105,0.7);
  border-bottom: 3px solid rgba(51,65,85,0.9);
  color: #e2e8f0;
  box-shadow:
    0 1px 0 rgba(71,85,105,0.3) inset,
    0 2px 8px rgba(2,6,23,0.4);
}
.dark .keycap--idle:hover {
  background: linear-gradient(180deg, rgba(71,85,105,0.6) 0%, rgba(51,65,85,0.7) 100%);
  border-color: rgba(100,116,139,0.7);
  box-shadow:
    0 1px 0 rgba(71,85,105,0.4) inset,
    0 6px 16px rgba(2,6,23,0.5);
}

.keycap--correct {
  background: linear-gradient(180deg, #d1fae5 0%, #a7f3d0 100%);
  border: 1px solid #6ee7b7;
  border-bottom: 3px solid #34d399;
  color: #065f46;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.6) inset,
    0 2px 8px rgba(16,185,129,0.2);
}
.dark .keycap--correct {
  background: linear-gradient(180deg, rgba(6,95,70,0.5) 0%, rgba(6,78,59,0.6) 100%);
  border: 1px solid rgba(52,211,153,0.5);
  border-bottom: 3px solid rgba(16,185,129,0.6);
  color: #6ee7b7;
  box-shadow:
    0 1px 0 rgba(52,211,153,0.15) inset,
    0 2px 8px rgba(16,185,129,0.15);
}

.keycap--wrong {
  background: linear-gradient(180deg, #fee2e2 0%, #fecaca 100%);
  border: 1px solid #fca5a5;
  border-bottom: 3px solid #f87171;
  color: #991b1b;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.5) inset,
    0 2px 8px rgba(239,68,68,0.15);
}
.dark .keycap--wrong {
  background: linear-gradient(180deg, rgba(127,29,29,0.5) 0%, rgba(69,10,10,0.6) 100%);
  border: 1px solid rgba(239,68,68,0.4);
  border-bottom: 3px solid rgba(185,28,28,0.6);
  color: #fca5a5;
  box-shadow:
    0 1px 0 rgba(239,68,68,0.1) inset,
    0 2px 8px rgba(239,68,68,0.1);
}

.keycap--disabled {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-bottom: 2px solid #e2e8f0;
  color: #cbd5e1;
  box-shadow: none;
  opacity: 0.7;
}
.dark .keycap--disabled {
  background: rgba(30,41,59,0.5);
  border: 1px solid rgba(51,65,85,0.4);
  border-bottom: 2px solid rgba(51,65,85,0.4);
  color: rgba(100,116,139,0.5);
  opacity: 0.6;
}

.keycap--pressed {
  animation: keyPress 0.2s cubic-bezier(0.4,0,0.2,1), keyPing 0.5s cubic-bezier(0,0,0.2,1);
  background: linear-gradient(180deg, #e0e7ff 0%, #c7d2fe 100%) !important;
  border-color: #818cf8 !important;
  border-bottom-width: 1px !important;
  color: #3730a3 !important;
  transform: translateY(2px);
}
.dark .keycap--pressed {
  animation: keyPress 0.2s cubic-bezier(0.4,0,0.2,1), keyPingDark 0.5s cubic-bezier(0,0,0.2,1);
  background: linear-gradient(180deg, rgba(67,56,202,0.4) 0%, rgba(55,48,163,0.5) 100%) !important;
  border-color: rgba(129,140,248,0.7) !important;
  color: #a5b4fc !important;
}
`;

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [gameState, setGameState] = useState(getNewGame);
  const [scores, setScores] = useState({wins: 0, losses: 0});
  const [diamonds, setDiamonds] = useState(getInitialDiamonds);
  const [diamondsEarnedThisGame, setDiamondsEarnedThisGame] = useState(0);
  const [diamondPopup, setDiamondPopup] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  const [theme, setTheme] = useState(getInitialTheme);
  const [showResult, setShowResult] = useState(false);
  const [resultShown, setResultShown] = useState(false);
  const [particles, setParticles] = useState([]);
  const [fireworks, setFireworks] = useState([]);
  const [shakeKey, setShakeKey] = useState(0);
  const [flashType, setFlashType] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [combo, setCombo] = useState(0);
  const [comboMsg, setComboMsg] = useState(null);
  const [revealedLetter, setRevealedLetter] = useState(null);
  const [pressedLetter, setPressedLetter] = useState(null);
  const [winStreak, setWinStreak] = useState(0);
  const [resultMsg, setResultMsg] = useState("");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintRevealKey, setHintRevealKey] = useState(0);
  const [ropeSnapFlash, setRopeSnapFlash] = useState(false);
  const toastRef = useRef(null);
  const comboRef = useRef(null);
  const diamondRef = useRef(null);
  const keyPressRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(DIAMONDS_STORAGE_KEY, String(diamonds));
    } catch {
      // ignore
    }
  }, [diamonds]);

  const awardDiamonds = useCallback((amount, label) => {
    if (amount <= 0) return;
    setDiamonds((d) => d + amount);
    setDiamondsEarnedThisGame((d) => d + amount);
    clearTimeout(diamondRef.current);
    setDiamondPopup({amount, label, key: newId()});
    diamondRef.current = setTimeout(() => setDiamondPopup(null), 1800);
    soundManager.playCoinCollect();
  }, []);

  const {word, category, clue, guessedLetters} = gameState;
  console.log("Word:", word);
  const wrongLetters = [...guessedLetters].filter((l) => !word.includes(l));
  const correctLetters = [...guessedLetters].filter((l) => word.includes(l));
  const wrongGuesses = wrongLetters.length;
  const isLost = wrongGuesses >= MAX_WRONG;
  const isWon = word.split("").every((l) => guessedLetters.has(l));
  const isOver = isWon || isLost;
  const nearDeath = wrongGuesses === MAX_WRONG - 1 && !isOver;

  const showToast = useCallback((msg) => {
    clearTimeout(toastRef.current);
    setToastMsg(msg);
    toastRef.current = setTimeout(() => setToastMsg(null), 1400);
  }, []);

  const spawnParticles = useCallback((emojis, count, cx = 50) => {
    const items = Array.from({length: count}, (_, k) => ({
      id: newId(),
      emoji: emojis[k % emojis.length],
      left: cx + (Math.random() - 0.5) * 60,
      top: 38 + Math.random() * 20,
      duration: 700 + Math.random() * 600,
      fontSize: 18 + Math.random() * 18,
    }));
    setParticles((p) => [...p, ...items]);
    setTimeout(() => {
      setParticles((p) => p.filter((x) => !items.find((i) => i.id === x.id)));
    }, 1400);
  }, []);

  const launchFireworks = useCallback(() => {
    const bursts = Array.from({length: 9}, (_, i) => ({
      id: i,
      x: 8 + ((i * 11) % 84),
      y: 5 + ((i * 7) % 60),
      hue: (i * 40) % 360,
      delay: i * 0.13,
    }));
    setFireworks(bursts);
    setTimeout(() => setFireworks([]), 2400);
  }, []);

  // ── Hint logic ───────────────────────────────────────────────────────────
  const unrevealedLetters = word
    .split("")
    .filter((l) => !guessedLetters.has(l));
  const uniqueUnrevealed = [...new Set(unrevealedLetters)];
  const canHint =
    !isOver && uniqueUnrevealed.length > 0 && hintsUsed < MAX_HINTS_PER_GAME;
  const canAffordHint = diamonds >= HINT_COST;

  const useHint = useCallback(() => {
    if (!canHint || !canAffordHint) return;
    setShowHintModal(false);
    const letter =
      uniqueUnrevealed[Math.floor(Math.random() * uniqueUnrevealed.length)];
    setDiamonds((d) => d - HINT_COST);
    setHintsUsed((h) => h + 1);
    const newGuessed = new Set(guessedLetters);
    newGuessed.add(letter);
    setGameState((s) => ({...s, guessedLetters: newGuessed}));
    setRevealedLetter(letter);
    setTimeout(() => setRevealedLetter(null), 600);
    setHintRevealKey((k) => k + 1);
    soundManager.playCoinCollect();
    showToast(`${E.bulb} Hint: ${letter}`);
    spawnParticles([E.bulb, E.sparkles, E.gem], 6, 50);
  }, [
    canHint,
    canAffordHint,
    uniqueUnrevealed,
    guessedLetters,
    diamonds,
    showToast,
    spawnParticles,
  ]);

  // ── Game over ──────────────────────────────────────────────────────────────
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOver && !resultShown) {
      setResultShown(true);
      setResultMsg(isWon ? pick(WIN_LINES) : pick(LOSE_LINES));
      // Win sequence: rope snap(~0.6s) → fall(~1.9s) → trophy(~2.6s) → dance(~3.3s)
      // Show result panel after the full sequence
      const t = setTimeout(() => setShowResult(true), isWon ? 4200 : 600);

      if (isWon) {
        soundManager.playWin();
        setScores((s) => ({...s, wins: s.wins + 1}));
        setWinStreak((s) => s + 1);

        // Immediate subtle flash for tactile win feedback
        setFlashType("green");
        setTimeout(() => setFlashType(null), 400);

        // Rope snap flash + sound when rope breaks
        setTimeout(() => {
          setRopeSnapFlash(true);
          soundManager.playRopeSnap();
          setTimeout(() => setRopeSnapFlash(false), 700);
        }, 600);

        // Landing thud
        setTimeout(() => soundManager.playLandingThud(), 1900);

        // Trophy catch sound
        setTimeout(() => soundManager.playTrophyCatch(), 2600);

        // Big confetti + fireworks when the victory dance starts
        setTimeout(() => {
          spawnParticles(CONFETTI_EMOJIS, 28, 50);
          launchFireworks();
        }, 3300);

        // Win bonus diamonds
        let winBonus = REWARDS.winGame;
        const finalWrong = [...guessedLetters].filter(
          (l) => !word.includes(l),
        ).length;
        if (finalWrong === 0) winBonus += REWARDS.perfectGame;
        const newStreak = winStreak + 1;
        if (newStreak >= 2) winBonus += REWARDS.streakBonus * newStreak;
        setTimeout(() => {
          setDiamonds((d) => d + winBonus);
          setDiamondsEarnedThisGame((d) => d + winBonus);
          soundManager.playBigReward();
        }, 3500);

        // Victory bells during dance
        setTimeout(() => soundManager.playVictoryBells(), 3300);
      } else {
        soundManager.playLose();
        setScores((s) => ({...s, losses: s.losses + 1}));
        setWinStreak(0);
        spawnParticles(SKULL_RAIN, 14, 50);
        setFlashType("red");
        setTimeout(() => setFlashType(null), 700);
      }
      return () => clearTimeout(t);
    }
  }, [
    isOver,
    isWon,
    resultShown,
    spawnParticles,
    launchFireworks,
    guessedLetters,
    word,
    winStreak,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Guess ──────────────────────────────────────────────────────────────────
  const handleGuess = useCallback(
    (letter) => {
      if (guessedLetters.has(letter) || isOver) return;
      clearTimeout(keyPressRef.current);
      setPressedLetter(letter);
      keyPressRef.current = setTimeout(() => setPressedLetter(null), 200);
      soundManager.playKeyClick();
      const newGuessed = new Set(guessedLetters);
      newGuessed.add(letter);

      if (word.includes(letter)) {
        const newCombo = combo + 1;
        setCombo(newCombo);
        setRevealedLetter(letter);
        setTimeout(() => setRevealedLetter(null), 500);

        // Award diamonds for correct letter
        let letterReward = REWARDS.correctLetter;
        if (newCombo >= 5) letterReward += REWARDS.combo5plus;
        else if (newCombo >= 4) letterReward += REWARDS.combo4;
        else if (newCombo >= 3) letterReward += REWARDS.combo3;
        else if (newCombo >= 2) letterReward += REWARDS.combo2;
        awardDiamonds(
          letterReward,
          newCombo >= 2 ? `Combo x${newCombo}` : "Correct!",
        );

        if (newCombo >= 2) {
          const msg = COMBO_MSGS[Math.min(newCombo - 2, COMBO_MSGS.length - 1)];
          clearTimeout(comboRef.current);
          setComboMsg(msg);
          comboRef.current = setTimeout(() => setComboMsg(null), 1200);
          soundManager.playCombo(newCombo);
        } else {
          setTimeout(() => soundManager.playCorrect(), 50);
        }
        showToast(pick(CORRECT_MSGS));
        setFlashType("green");
        setTimeout(() => setFlashType(null), 350);
        spawnParticles(CONFETTI_EMOJIS, 5, 50);
      } else {
        setCombo(0);
        setTimeout(() => soundManager.playWrong(), 50);
        showToast(pick(WRONG_MSGS));
        setShakeKey((k) => k + 1);
        setFlashType("red");
        setTimeout(() => setFlashType(null), 400);
        spawnParticles(SKULL_RAIN, 3, 50);
        const newWrong = [...newGuessed].filter(
          (l) => !word.includes(l),
        ).length;
        if (newWrong === MAX_WRONG - 1)
          setTimeout(() => soundManager.playNearDeath(), 300);
        else setTimeout(() => soundManager.playBodyPart(), 200);
      }
      setGameState((s) => ({...s, guessedLetters: newGuessed}));
    },
    [
      guessedLetters,
      word,
      isOver,
      combo,
      showToast,
      spawnParticles,
      awardDiamonds,
    ],
  );

  // ── Physical keyboard ──────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e) => {
      const l = e.key.toUpperCase();
      if (/^[A-Z]$/.test(l)) handleGuess(l);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [handleGuess]);

  const startNewGame = () => {
    soundManager.playNewGame();
    setShowResult(false);
    setResultShown(false);
    setCombo(0);
    setParticles([]);
    setFireworks([]);
    setToastMsg(null);
    setComboMsg(null);
    setDiamondsEarnedThisGame(0);
    setDiamondPopup(null);
    setHintsUsed(0);
    setShowHintModal(false);
    setRopeSnapFlash(false);
    setGameState(getNewGame());
  };

  const toggleSound = () => setSoundOn(soundManager.toggle());
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const progressPct = (wrongGuesses / MAX_WRONG) * 100;
  const progressColor =
    wrongGuesses <= 2
      ? "bg-emerald-500"
      : wrongGuesses <= 4
        ? "bg-amber-400"
        : "bg-red-500";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>

      {/* Screen flash overlay */}
      {flashType && (
        <div
          className="fixed inset-0 z-40 pointer-events-none"
          style={{
            background:
              flashType === "red"
                ? "radial-gradient(ellipse at 50% 40%, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0.06) 50%, transparent 80%)"
                : "radial-gradient(ellipse at 50% 40%, rgba(34,197,94,0.14) 0%, rgba(34,197,94,0.04) 50%, transparent 80%)",
            animation: `${flashType === "red" ? "flashRed" : "flashGreen"} 0.5s cubic-bezier(0.4,0,0.2,1) forwards`,
          }}
        />
      )}

      {/* Rope-snap golden flash (fires when rope breaks) */}
      {ropeSnapFlash && (
        <div
          className="fixed inset-0 z-40 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 15%, rgba(253,224,71,0.5) 0%, rgba(251,191,36,0.2) 35%, transparent 65%)",
            animation: "ropeSnapFlash 0.8s cubic-bezier(0.4,0,0.2,1) forwards",
          }}
        />
      )}

      {/* Floating emoji particles */}
      <div className="fixed inset-0 z-30 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.left}%`,
              top: `${p.top}%`,
              fontSize: p.fontSize,
              animation: `floatUp ${p.duration}ms ease forwards`,
              lineHeight: 1,
            }}
          >
            {p.emoji}
          </div>
        ))}
      </div>

      {/* Firework bursts */}
      {fireworks.map((b) => (
        <div
          key={b.id}
          className="fixed pointer-events-none z-45"
          style={{left: `${b.x}%`, top: `${b.y}%`}}
        >
          {FW_DIRS.map((dir, j) => (
            <div
              key={j}
              style={{
                position: "absolute",
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: `hsl(${b.hue + j * 30}, 90%, 60%)`,
                "--fw-dx": `${dir.dx}px`,
                "--fw-dy": `${dir.dy}px`,
                animation: `sparkleOut 0.85s ease forwards`,
                animationDelay: `${b.delay}s`,
              }}
            />
          ))}
        </div>
      ))}

      {/* ── PAGE ─────────────────────────────────────────────────────────── */}
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-gray-950 dark:to-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center px-4 py-6 sm:px-6 sm:py-10 font-sans relative overflow-hidden transition-colors duration-700">
        {/* Background layers */}
        <div className="absolute top-0 left-1/4 w-125 h-125 rounded-full bg-indigo-100/40 dark:bg-indigo-500/8 blur-3xl pointer-events-none transition-colors duration-1000" />
        <div className="absolute bottom-20 right-1/4 w-100 h-100 rounded-full bg-violet-100/30 dark:bg-fuchsia-500/6 blur-3xl pointer-events-none transition-colors duration-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 rounded-full bg-sky-50/40 dark:bg-sky-900/5 blur-3xl pointer-events-none transition-colors duration-1000" />
        <div className="absolute inset-0 bg-aurora pointer-events-none" />
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <div className="absolute inset-0 bg-vignette pointer-events-none" />

        {/* Toast */}
        {toastMsg && (
          <div
            className="fixed top-5 left-1/2 z-50 -translate-x-1/2 bg-white/95 dark:bg-slate-900/95 border border-slate-200/70 dark:border-slate-700/70 text-slate-800 dark:text-slate-100 font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-black/5 dark:shadow-black/20 whitespace-nowrap backdrop-blur-md"
            style={{
              animation: "popIn 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}
          >
            {toastMsg}
          </div>
        )}

        {/* Combo banner */}
        {comboMsg && (
          <div
            className="fixed top-14 left-1/2 z-50 -translate-x-1/2 text-xl font-black text-orange-500 dark:text-orange-400 whitespace-nowrap"
            style={{
              animation: "comboZoom 1s cubic-bezier(0.34,1.56,0.64,1) forwards",
              textShadow: "0 2px 12px rgba(249,115,22,0.3)",
            }}
          >
            {comboMsg}
          </div>
        )}

        {/* Diamond earned popup */}
        {diamondPopup && (
          <div
            key={diamondPopup.key}
            className="fixed top-24 left-1/2 z-50 -translate-x-1/2 flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 text-cyan-600 dark:text-cyan-300 font-bold text-sm px-4 py-2 rounded-xl shadow-lg shadow-cyan-500/10 dark:shadow-cyan-500/5 whitespace-nowrap border border-cyan-200/60 dark:border-cyan-800/40 backdrop-blur-sm"
            style={{
              animation:
                "diamondPop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards, diamondFloat 1.6s ease 0.35s forwards",
            }}
          >
            {E.gem} +{diamondPopup.amount} {diamondPopup.label}
          </div>
        )}

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <header className="w-full max-w-5xl flex items-center justify-between mb-6 relative z-10">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-black tracking-wider select-none font-display"
              style={{
                background:
                  "linear-gradient(135deg, #0f172a 0%, #334155 40%, #0f172a 100%)",
                backgroundSize: "200% 200%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "rainbow 8s ease infinite",
              }}
            >
              <span className="dark:hidden">HANGMAN</span>
              <span
                className="hidden dark:inline"
                style={{
                  background:
                    "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 40%, #f1f5f9 100%)",
                  backgroundSize: "200% 200%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  animation: "rainbow 8s ease infinite",
                }}
              >
                HANGMAN
              </span>
            </h1>
            <p className="text-slate-400 dark:text-slate-500 text-xs tracking-widest uppercase font-medium mt-0.5">
              {isOver
                ? isWon
                  ? `${E.trophy} You won!`
                  : `${E.skull} Game Over`
                : "Guess the word"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Diamond counter */}
            <div className="h-9 px-3 rounded-xl border border-cyan-200/60 dark:border-cyan-800/40 text-cyan-600 dark:text-cyan-300 font-bold text-sm flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-sm">
              {E.gem}
              <span className="tabular-nums">{diamonds}</span>
            </div>

            {winStreak >= 2 && (
              <div
                className="h-9 px-3 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-sm border border-amber-200/80 dark:border-amber-700/40 text-amber-600 dark:text-amber-400 font-bold text-sm flex items-center gap-1.5"
                style={{
                  animation:
                    "streakSlide 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
                }}
              >
                {E.fire} {winStreak}
              </div>
            )}

            <div className="h-9 px-3 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-sm border border-emerald-200/60 dark:border-slate-700/80 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center gap-1.5">
              {E.trophy} {scores.wins}
            </div>
            <div className="h-9 px-3 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-sm border border-red-200/50 dark:border-slate-700/80 text-red-500 dark:text-red-400 font-bold text-sm flex items-center gap-1.5">
              {E.skull} {scores.losses}
            </div>

            <button
              onClick={toggleTheme}
              className="h-9 w-9 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-sm border border-slate-200/80 dark:border-slate-700/80 text-base text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-105 active:scale-95"
              aria-label={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? "\u2600\uFE0F" : "\u{1F319}"}
            </button>

            <button
              onClick={toggleSound}
              className="h-9 w-9 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-sm border border-slate-200/80 dark:border-slate-700/80 text-base text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {soundOn ? E.loud : E.mute}
            </button>
          </div>
        </header>

        {/* ── MAIN CARD ───────────────────────────────────────────────────── */}
        <main className="w-full max-w-5xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-[0_24px_80px_-16px_rgba(15,23,42,0.10)] dark:shadow-[0_24px_80px_-16px_rgba(0,0,0,0.35)] relative">
          {/* Category badge */}
          <div className="flex justify-center mb-3">
            <span className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 px-5 py-1.5 rounded-full text-[11px] font-semibold tracking-widest uppercase shadow-sm">
              {E.folder} {category}
            </span>
          </div>

          {/* Clue / Question */}
          <div className="flex justify-center mb-5">
            <div className="bg-linear-to-b from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-800/40 border border-slate-200/50 dark:border-slate-700/40 rounded-2xl px-6 py-4 max-w-xl w-full text-center shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
                {E.bulb} Clue
              </p>
              <p className="text-base font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                {clue}
              </p>
            </div>
          </div>

          {/* Taunt bar */}
          <div className="flex justify-center mb-4 min-h-5">
            {TAUNTS[wrongGuesses] && !isOver && (
              <p
                className={`text-xs font-semibold ${nearDeath ? "text-red-500 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}`}
                style={
                  nearDeath ? {animation: "dangerPulse 0.8s ease infinite"} : {}
                }
              >
                {TAUNTS[wrongGuesses]}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 lg:gap-10 items-start">
            {/* LEFT: canvas + lives */}
            <div className="flex flex-col items-center gap-3 mx-auto lg:mx-0 w-full">
              <div
                key={shakeKey}
                className={`rounded-2xl p-4 border transition-all duration-1000 ease-in-out w-full flex items-center justify-center ${
                  isWon
                    ? "bg-linear-to-b from-amber-50/80 to-orange-50/40 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-300/60 dark:border-amber-700/40 shadow-lg shadow-amber-200/20 dark:shadow-amber-900/10"
                    : isLost
                      ? "bg-linear-to-b from-red-50/60 to-rose-50/30 dark:from-red-950/20 dark:to-red-900/10 border-red-300/40 dark:border-red-800/40 shadow-lg shadow-red-200/15 dark:shadow-red-900/10"
                      : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/40"
                }`}
                style={{
                  ...(shakeKey > 0
                    ? {
                        animation:
                          "shake 0.4s cubic-bezier(0.36,0.07,0.19,0.97)",
                      }
                    : {}),
                  ...(isWon
                    ? {
                        animation: "glowRing 3s ease infinite 3.6s",
                      }
                    : {}),
                }}
              >
                <HangmanCanvas
                  wrongGuesses={wrongGuesses}
                  lost={isLost}
                  won={isWon}
                />
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-85 px-1">
                <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 mb-1.5">
                  <span className="font-semibold">Mistakes</span>
                  <span
                    className={`font-bold tabular-nums ${wrongGuesses >= 5 ? "text-red-500" : "text-slate-600 dark:text-slate-300"}`}
                  >
                    {wrongGuesses} / {MAX_WRONG}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${progressColor}`}
                    style={{
                      width: `${progressPct}%`,
                      ...(nearDeath
                        ? {animation: "dangerPulse 0.6s ease infinite"}
                        : {}),
                    }}
                  />
                </div>
                <div className="flex justify-center gap-2 mt-2">
                  {Array.from({length: MAX_WRONG}, (_, i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        i < wrongGuesses
                          ? "bg-red-400 dark:bg-red-500 scale-110"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: word + keyboard */}
            <div className="flex-1 w-full flex flex-col gap-4">
              {/* Word blanks */}
              <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 min-h-16 py-3">
                {word.split("").map((letter, i) => {
                  const revealed = guessedLetters.has(letter);
                  const justRevealed = revealedLetter === letter;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <span
                        className={`text-2xl sm:text-3xl font-black w-9 sm:w-10 inline-block text-center transition-all duration-300 ${
                          revealed
                            ? isLost
                              ? "text-red-500"
                              : "text-slate-800 dark:text-slate-100"
                            : isLost
                              ? "text-red-400/60"
                              : "text-transparent"
                        }`}
                        style={
                          revealed && justRevealed
                            ? {
                                animation:
                                  "letterPop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
                              }
                            : {}
                        }
                      >
                        {revealed || isLost ? letter : "?"}
                      </span>
                      <div
                        className={`h-0.75 w-9 sm:w-10 rounded-full transition-all duration-500 ${
                          revealed
                            ? isLost
                              ? "bg-red-400"
                              : "bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                            : "bg-slate-300 dark:bg-slate-600"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Wrong letter badges */}
              <div className="min-h-8 flex flex-wrap justify-center gap-2 items-center">
                {wrongLetters.length > 0 && (
                  <>
                    <span className="w-full text-center text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest font-semibold mb-0.5">
                      {E.skull} Wrong guesses
                    </span>
                    {wrongLetters.map((l) => (
                      <span
                        key={l}
                        className="bg-red-50 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/50 text-red-500 dark:text-red-400 px-3 py-1 rounded-lg text-xs font-bold shadow-sm"
                        style={{
                          animation:
                            "popIn 0.15s cubic-bezier(0.34,1.56,0.64,1) forwards",
                        }}
                      >
                        {l}
                      </span>
                    ))}
                  </>
                )}
              </div>

              {/* Keyboard */}
              <div className="keyboard-surface px-3 py-3 sm:px-5 sm:py-4">
                <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                  {KEY_ROWS.map((row, rowIndex) => (
                    <div
                      key={row}
                      className={`flex justify-center gap-1 sm:gap-1.5 ${
                        rowIndex === 1
                          ? "px-2 sm:px-4"
                          : rowIndex === 2
                            ? "px-4 sm:px-8"
                            : ""
                      }`}
                    >
                      {row.split("").map((letter) => {
                        const isGuessed = guessedLetters.has(letter);
                        const isCorrect = isGuessed && word.includes(letter);
                        const isWrong = isGuessed && !word.includes(letter);
                        const stateClass = isCorrect
                          ? "keycap--correct"
                          : isWrong
                            ? "keycap--wrong"
                            : isOver
                              ? "keycap--disabled"
                              : "keycap--idle";
                        const isPressed = pressedLetter === letter;
                        return (
                          <button
                            key={letter}
                            onClick={() => handleGuess(letter)}
                            disabled={isGuessed || isOver}
                            className={`keycap ${stateClass} ${
                              isPressed ? "keycap--pressed" : ""
                            } w-9 h-11 sm:w-11 sm:h-12 text-xs sm:text-sm select-none ${
                              isGuessed || isOver
                                ? "cursor-default opacity-transition"
                                : "hover:-translate-y-0.5 active:scale-95"
                            }`}
                          >
                            {letter}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-center gap-3 pt-2">
                {/* Hint button */}
                <button
                  onClick={() => setShowHintModal(true)}
                  disabled={!canHint}
                  className={`group h-11 px-6 rounded-xl font-bold text-sm tracking-wider transition-all duration-200 flex items-center gap-2 border ${
                    canHint
                      ? "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 shadow-md shadow-slate-900/8 hover:shadow-lg hover:scale-[1.03] active:scale-[0.97]"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-none"
                  }`}
                  title={
                    !canHint
                      ? hintsUsed >= MAX_HINTS_PER_GAME
                        ? "No hints left"
                        : isOver
                          ? "Game over"
                          : "No letters left"
                      : `Use hint (${HINT_COST} diamonds)`
                  }
                >
                  {E.bulb} HINT
                  <span className="text-[10px] opacity-50">
                    ({HINT_COST}
                    {E.gem})
                  </span>
                </button>

                {/* New game button */}
                <button
                  onClick={startNewGame}
                  className="group h-11 px-8 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm shadow-lg shadow-slate-900/20 dark:shadow-black/10 transition-all duration-200 hover:shadow-xl hover:scale-[1.03] active:scale-[0.97] tracking-wider flex items-center gap-2 border border-slate-800 dark:border-slate-200"
                >
                  <span className="inline-block group-hover:animate-[spin_0.5s_linear]">
                    {E.refresh}
                  </span>
                  NEW GAME
                </button>
              </div>
            </div>
          </div>
        </main>

        <p className="mt-5 text-slate-400 dark:text-slate-600 text-[11px] text-center select-none font-medium tracking-wide">
          {E.kbd} Tip: Use your physical keyboard too!
        </p>

        {/* ════════════════════════════════════════════════════════════════════
            HINT MODAL
        ════════════════════════════════════════════════════════════════════ */}
        {showHintModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{animation: "backdropFade 0.25s ease forwards"}}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowHintModal(false);
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(8px)",
              }}
            />

            <div
              className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 text-center max-w-sm w-full z-10 border border-slate-200 dark:border-slate-700 shadow-2xl shadow-black/20"
              style={{
                animation:
                  "modalSlideUp 0.3s cubic-bezier(.34,1.56,.64,1) forwards",
              }}
            >
              {/* Icon */}
              <div className="text-5xl leading-none select-none mb-2 inline-block">
                {E.bulb}
              </div>

              <h2 className="font-bold text-xl tracking-wider mb-1 text-slate-800 dark:text-slate-100">
                USE A HINT?
              </h2>

              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                Reveal a random letter from the word.
              </p>

              {/* Cost display */}
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 mb-4">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl">{E.gem}</span>
                  <div className="text-left">
                    <div className="font-bold text-xl text-slate-800 dark:text-slate-100">
                      {HINT_COST}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      diamonds
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-400 dark:text-slate-500">
                    Your balance
                  </span>
                  <span
                    className={`font-bold ${canAffordHint ? "text-cyan-600 dark:text-cyan-400" : "text-red-500"}`}
                  >
                    {E.gem} {diamonds}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-400 dark:text-slate-500">
                    Hints remaining
                  </span>
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    {MAX_HINTS_PER_GAME - hintsUsed} / {MAX_HINTS_PER_GAME}
                  </span>
                </div>
              </div>

              {/* Not enough diamonds warning */}
              {!canAffordHint && (
                <div
                  className="bg-red-50 dark:bg-red-950/20 border border-red-200/70 dark:border-red-800/50 rounded-lg py-2 px-3 mb-3 text-red-500 text-xs font-medium"
                  style={{
                    animation:
                      "popIn 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards",
                  }}
                >
                  {E.cross} Not enough diamonds! Need {HINT_COST - diamonds}{" "}
                  more.
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowHintModal(false)}
                  className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={useHint}
                  disabled={!canAffordHint}
                  className={`flex-1 h-10 rounded-xl font-bold text-sm transition-all duration-150 ${
                    canAffordHint
                      ? "bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-md shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98]"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                  }`}
                >
                  {canAffordHint
                    ? `${E.bulb} Reveal Letter`
                    : `${E.lock} Locked`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            RESULT OVERLAY — WIN
        ════════════════════════════════════════════════════════════════════ */}
        {showResult && isWon && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
            style={{
              animation: "backdropFade 0.4s cubic-bezier(0.4,0,0.2,1) forwards",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowResult(false);
            }}
          >
            {/* Frosted glass backdrop with warm tint */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(254,243,199,0.5) 30%, rgba(253,230,138,0.4) 60%, rgba(255,255,255,0.5) 100%)",
                backdropFilter: "blur(16px) saturate(1.2)",
              }}
            />
            {/* Dark mode backdrop */}
            <div
              className="absolute inset-0 hidden dark:block"
              style={{
                background:
                  "linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(30,27,15,0.8) 40%, rgba(15,23,42,0.85) 100%)",
                backdropFilter: "blur(16px) saturate(1.2)",
              }}
            />

            {/* Confetti rain */}
            {PIECES_DATA.slice(0, 28).map((p) => (
              <div
                key={p.id}
                style={{
                  position: "fixed",
                  left: `${p.left}%`,
                  top: "-30px",
                  width:
                    p.shape === "circle"
                      ? p.size * 0.8
                      : p.shape === "diamond"
                        ? p.size * 0.6
                        : p.size * 0.8,
                  height:
                    p.shape === "circle"
                      ? p.size * 0.8
                      : p.shape === "diamond"
                        ? p.size * 0.6
                        : p.size * 0.35,
                  borderRadius: p.shape === "circle" ? "50%" : "1px",
                  background: p.color,
                  transform: p.shape === "diamond" ? "rotate(45deg)" : "none",
                  animation: `fallDown ${p.duration}s linear ${p.delay}s infinite`,
                  opacity: 0.65,
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              />
            ))}

            {/* Stars in corners */}
            {STAR_POSITIONS.slice(0, 8).map((s, i) => (
              <div
                key={i}
                style={{
                  position: "fixed",
                  top: `${s.top}%`,
                  left: `${s.left}%`,
                  fontSize: 12 + (i % 3) * 5,
                  opacity: 0.4,
                  animation: `starFloat ${1.5 + (i % 4) * 0.5}s ease ${(i * 0.2) % 1}s infinite alternate`,
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              >
                {[E.star2, E.sparkles, E.star][i % 3]}
              </div>
            ))}

            {/* ── WIN CARD ─────────────────────────────────────────────── */}
            <div
              className="relative bg-white dark:bg-slate-900 rounded-2xl p-7 text-center max-w-md w-full z-10 border border-slate-200/80 dark:border-slate-700/80 shadow-2xl shadow-black/10 dark:shadow-black/30"
              style={{
                animation:
                  "resultSlideIn 0.5s cubic-bezier(.34,1.56,.64,1) forwards",
              }}
            >
              {/* Trophy animation */}
              <div
                style={{
                  animation:
                    "victoryBounce 0.7s cubic-bezier(.34,1.56,.64,1) forwards",
                }}
              >
                <div
                  className="text-7xl leading-none select-none mx-auto inline-block"
                  style={{
                    animation: "trophyFloat 2.5s ease 0.8s infinite alternate",
                  }}
                >
                  {E.trophy}
                </div>
              </div>

              {/* Crown accent */}
              <div className="flex justify-center gap-1.5 -mt-1 mb-1.5">
                <span
                  style={{
                    fontSize: 14,
                    opacity: 0.5,
                    animation: "starFloat 1.2s ease .1s infinite alternate",
                  }}
                >
                  {E.sparkles}
                </span>
                <span
                  style={{
                    fontSize: 16,
                    opacity: 0.6,
                    animation: "starFloat 1.2s ease .3s infinite alternate",
                  }}
                >
                  {E.crown}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    opacity: 0.5,
                    animation: "starFloat 1.2s ease .2s infinite alternate",
                  }}
                >
                  {E.sparkles}
                </span>
              </div>

              {/* WINNER! text */}
              <div
                className="font-black tracking-wider mb-1"
                style={{
                  fontSize: 36,
                  lineHeight: 1.1,
                  color: "#1e293b",
                }}
              >
                <span className="dark:hidden">WINNER!</span>
                <span className="hidden dark:inline" style={{color: "#f1f5f9"}}>
                  WINNER!
                </span>
              </div>

              {/* Funny win message */}
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-4">
                {resultMsg}
              </p>

              {/* Win streak badge */}
              {winStreak >= 2 && (
                <div
                  className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 font-bold text-xs px-3 py-1 rounded-full mb-3"
                  style={{
                    animation:
                      "badgePop 0.4s cubic-bezier(.34,1.56,.64,1) forwards",
                  }}
                >
                  {E.fire} {winStreak} WIN STREAK {E.fire}
                </div>
              )}

              {/* Word reveal box */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl py-2.5 px-4 mb-4">
                <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest mb-0.5 font-medium">
                  You solved
                </p>
                <p className="font-black text-xl tracking-widest text-slate-800 dark:text-slate-100">
                  {word}
                </p>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold uppercase tracking-widest">
                  {category}
                </p>
              </div>

              {/* Diamonds earned this game */}
              {diamondsEarnedThisGame > 0 && (
                <div
                  className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl py-2.5 px-4 mb-4"
                  style={{animation: "rewardSlide 0.4s ease 0.3s both"}}
                >
                  <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest mb-0.5 font-medium">
                    Diamonds earned
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      style={{
                        fontSize: 22,
                        animation: "diamondPop 0.5s ease 0.5s both",
                      }}
                    >
                      {E.gem}
                    </span>
                    <span className="font-black text-2xl text-cyan-600 dark:text-cyan-400">
                      +{diamondsEarnedThisGame}
                    </span>
                  </div>
                  <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-0.5 font-medium">
                    Total: {E.gem} {diamonds}
                  </p>
                </div>
              )}

              {/* Stats row */}
              <div className="flex justify-center gap-2 mb-5">
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-lg px-3 py-1.5 text-center">
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                    {correctLetters.length}
                  </div>
                  <div className="text-slate-400 dark:text-slate-500 text-[10px] font-medium">
                    {E.check} correct
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-lg px-3 py-1.5 text-center">
                  <div className="text-red-500 dark:text-red-400 font-bold text-lg">
                    {wrongGuesses}
                  </div>
                  <div className="text-slate-400 dark:text-slate-500 text-[10px] font-medium">
                    {E.cross} wrong
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-lg px-3 py-1.5 text-center">
                  <div className="text-slate-600 dark:text-slate-300 font-bold text-lg">
                    {scores.wins + scores.losses}
                  </div>
                  <div className="text-slate-400 dark:text-slate-500 text-[10px] font-medium">
                    {E.gamepad} played
                  </div>
                </div>
              </div>

              {/* Play again */}
              <button
                onClick={startNewGame}
                className="w-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-base py-3 rounded-xl shadow-md shadow-slate-900/20 dark:shadow-black/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {E.rocket} Play Again
              </button>

              <button
                onClick={() => setShowResult(false)}
                className="mt-2 text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 text-[11px] transition-colors font-medium"
              >
                close
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            RESULT OVERLAY — LOSE
        ════════════════════════════════════════════════════════════════════ */}
        {showResult && isLost && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              animation: "backdropFade 0.4s cubic-bezier(0.4,0,0.2,1) forwards",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowResult(false);
            }}
          >
            {/* Dark frosted backdrop */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(15,15,15,0.75) 0%, rgba(50,10,10,0.7) 50%, rgba(15,15,15,0.75) 100%)",
                backdropFilter: "blur(16px) saturate(0.8)",
              }}
            />

            {/* Skull particles in background */}
            {PIECES_DATA.slice(0, 12).map((p) => (
              <div
                key={p.id}
                style={{
                  position: "fixed",
                  left: `${p.left}%`,
                  top: "-20px",
                  fontSize: p.size + 4,
                  animation: `fallDown ${p.duration + 1}s linear ${p.delay}s infinite`,
                  opacity: 0.12,
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              >
                {E.skull}
              </div>
            ))}

            {/* ── LOSE CARD ────────────────────────────────────────────── */}
            <div
              className="relative bg-slate-950 border border-red-900/40 rounded-2xl p-7 text-center max-w-md w-full z-10 shadow-2xl shadow-black/30"
              style={{
                animation:
                  "resultSlideIn 0.5s cubic-bezier(.34,1.56,.64,1) forwards",
              }}
            >
              {/* Skull */}
              <div
                className="text-7xl leading-none select-none mb-1.5 inline-block"
                style={{
                  animation:
                    "loseSlam 0.6s cubic-bezier(.34,1.56,.64,1) forwards, loseShake 0.4s ease 0.7s 2",
                }}
              >
                {E.skull}
              </div>

              {/* GAME OVER */}
              <div
                className="font-black tracking-wider mb-1.5"
                style={{
                  fontSize: 32,
                  color: "#ef4444",
                  textShadow: "0 0 30px rgba(239,68,68,0.3)",
                }}
              >
                GAME OVER
              </div>

              <p className="text-red-400/80 font-medium text-sm mb-4">
                {resultMsg}
              </p>

              {/* Word reveal */}
              <div className="bg-red-950/40 border border-red-900/30 rounded-xl py-2.5 px-4 mb-4">
                <p className="text-red-500/60 text-[10px] uppercase tracking-widest mb-0.5 font-medium">
                  The word was
                </p>
                <p className="text-red-300 font-black text-xl tracking-widest">
                  {word}
                </p>
                <p className="text-red-700/60 text-[10px] font-semibold uppercase tracking-widest">
                  {category}
                </p>
              </div>

              {/* Diamonds earned this game (even on loss) */}
              {diamondsEarnedThisGame > 0 && (
                <div
                  className="bg-slate-900/60 border border-slate-800/60 rounded-xl py-2.5 px-4 mb-4"
                  style={{animation: "rewardSlide 0.4s ease 0.3s both"}}
                >
                  <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-0.5 font-medium">
                    Diamonds earned
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    <span style={{fontSize: 20}}>{E.gem}</span>
                    <span className="text-cyan-400 font-bold text-xl">
                      +{diamondsEarnedThisGame}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[10px] mt-0.5 font-medium">
                    Total: {E.gem} {diamonds}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="flex justify-center gap-2 mb-5">
                <div className="bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-1.5 text-center">
                  <div className="text-emerald-500 font-bold text-lg">
                    {correctLetters.length}
                  </div>
                  <div className="text-slate-600 text-[10px] font-medium">
                    {E.check} correct
                  </div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-1.5 text-center">
                  <div className="text-red-500 font-bold text-lg">
                    {wrongGuesses}
                  </div>
                  <div className="text-slate-600 text-[10px] font-medium">
                    {E.cross} wrong
                  </div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-1.5 text-center">
                  <div className="text-slate-400 font-bold text-lg">
                    {scores.wins + scores.losses}
                  </div>
                  <div className="text-slate-600 text-[10px] font-medium">
                    {E.gamepad} played
                  </div>
                </div>
              </div>

              {/* Try again */}
              <button
                onClick={startNewGame}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-base py-3 rounded-xl shadow-md shadow-red-900/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {E.refresh} Try Again
              </button>

              <button
                onClick={() => setShowResult(false)}
                className="mt-2 text-slate-600 hover:text-slate-400 text-[11px] transition-colors font-medium"
              >
                close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
