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
};

const MAX_WRONG = 6;
let _pid = 0;
const newId = () => ++_pid;

const THEME_STORAGE_KEY = "hangman_theme";
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
  const {word, category} = getRandomWord();
  return {word, category, guessedLetters: new Set()};
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
@keyframes flashRed   { 0%,100%{opacity:0;} 30%{opacity:.14;} }
@keyframes flashGreen { 0%,100%{opacity:0;} 30%{opacity:.09;} }
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
  0%   { transform:scale(0.7) translateY(40px); opacity:0; }
  70%  { transform:scale(1.05) translateY(-4px); opacity:1; }
  100% { transform:scale(1) translateY(0); opacity:1; }
}
@keyframes spin      { to { transform:rotate(360deg); } }
@keyframes floatAlt  { 0%{ transform:translateY(0); } 100%{ transform:translateY(-12px); } }

/* ── Victory-specific animations ── */
@keyframes victoryBounce {
  0%   { transform:scale(0) rotate(-180deg); opacity:0; }
  40%  { transform:scale(1.45) rotate(12deg); opacity:1; }
  60%  { transform:scale(0.88) rotate(-6deg); }
  80%  { transform:scale(1.12) rotate(4deg); }
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
  0%,100% { box-shadow:0 0 0 4px #fbbf24, 0 0 30px #f59e0b66, 0 25px 60px rgba(0,0,0,.22); }
  50%     { box-shadow:0 0 0 5px #fde68a, 0 0 60px #fbbf2499, 0 25px 70px rgba(0,0,0,.28); }
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
  from { opacity:0; }
  to   { opacity:1; }
}
@keyframes loseSlam {
  0%   { transform:scale(2) rotate(20deg); opacity:0; }
  50%  { transform:scale(0.9) rotate(-3deg); }
  100% { transform:scale(1) rotate(0deg); opacity:1; }
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
`;

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [gameState, setGameState] = useState(getNewGame);
  const [scores, setScores] = useState({wins: 0, losses: 0});
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
  const [winStreak, setWinStreak] = useState(0);
  const [resultMsg, setResultMsg] = useState("");
  const toastRef = useRef(null);
  const comboRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const {word, category, guessedLetters} = gameState;
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

  // ── Game over ──────────────────────────────────────────────────────────────
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOver && !resultShown) {
      setResultShown(true);
      setResultMsg(isWon ? pick(WIN_LINES) : pick(LOSE_LINES));
      const t = setTimeout(() => setShowResult(true), 600);

      if (isWon) {
        soundManager.playWin();
        setScores((s) => ({...s, wins: s.wins + 1}));
        setWinStreak((s) => s + 1);
        spawnParticles(CONFETTI_EMOJIS, 28, 50);
        launchFireworks();
        setFlashType("green");
        setTimeout(() => setFlashType(null), 600);
        // second bell cascade at 4 seconds in
        setTimeout(() => soundManager.playVictoryBells(), 4000);
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
  }, [isOver, isWon, resultShown, spawnParticles, launchFireworks]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Guess ──────────────────────────────────────────────────────────────────
  const handleGuess = useCallback(
    (letter) => {
      if (guessedLetters.has(letter) || isOver) return;
      soundManager.playKeyClick();
      const newGuessed = new Set(guessedLetters);
      newGuessed.add(letter);

      if (word.includes(letter)) {
        const newCombo = combo + 1;
        setCombo(newCombo);
        setRevealedLetter(letter);
        setTimeout(() => setRevealedLetter(null), 500);
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
    [guessedLetters, word, isOver, combo, showToast, spawnParticles],
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
            background: flashType === "red" ? "#ef4444" : "#22c55e",
            animation: `${flashType === "red" ? "flashRed" : "flashGreen"} 0.4s ease forwards`,
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
      <div className="min-h-screen bg-linear-to-br from-amber-50 via-orange-50 to-purple-100 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950 text-slate-900 dark:text-slate-100 flex flex-col items-center px-3 py-5 font-sans relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-orange-200/40 dark:bg-indigo-500/12 blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full bg-purple-200/40 dark:bg-fuchsia-500/10 blur-3xl pointer-events-none" />

        {/* Toast */}
        {toastMsg && (
          <div
            className="fixed top-5 left-1/2 z-50 -translate-x-1/2 bg-white/95 dark:bg-slate-900/95 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 font-black text-base px-6 py-2.5 rounded-2xl shadow-xl whitespace-nowrap"
            style={{animation: "popIn 0.25s ease forwards"}}
          >
            {toastMsg}
          </div>
        )}

        {/* Combo banner */}
        {comboMsg && (
          <div
            className="fixed top-16 left-1/2 z-50 -translate-x-1/2 text-2xl font-black text-orange-500 drop-shadow whitespace-nowrap"
            style={{animation: "comboZoom 1.2s ease forwards"}}
          >
            {comboMsg}
          </div>
        )}

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <header className="w-full max-w-3xl flex items-center justify-between mb-5">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-black tracking-widest select-none"
              style={{
                background:
                  "linear-gradient(90deg,#f97316,#ec4899,#a855f7,#3b82f6,#f97316)",
                backgroundSize: "300% 300%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "rainbow 4s linear infinite",
              }}
            >
              HANGMAN
            </h1>
            <p className="text-gray-400 dark:text-slate-400 text-xs tracking-widest uppercase">
              {isOver
                ? isWon
                  ? `${E.trophy} You won!`
                  : `${E.skull} Game Over`
                : "Guess the word"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {winStreak >= 2 && (
              <div
                className="bg-amber-100 dark:bg-amber-950/40 border border-amber-400 dark:border-amber-900 text-amber-700 dark:text-amber-300 font-black text-xs px-3 py-1 rounded-full flex items-center gap-1"
                style={{animation: "streakSlide 0.5s ease forwards"}}
              >
                {E.fire} {winStreak} streak
              </div>
            )}
            <div className="flex gap-2 text-xs font-bold">
              <span className="bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full">
                {E.trophy} {scores.wins}
              </span>
              <span className="bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-900 text-red-600 dark:text-red-300 px-3 py-1 rounded-full">
                {E.skull} {scores.losses}
              </span>
            </div>

            <button
              onClick={toggleTheme}
              className="h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs font-black tracking-widest text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
              aria-label={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? "LIGHT" : "DARK"}
            </button>

            <button
              onClick={toggleSound}
              className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-lg text-gray-800 dark:text-slate-100 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 hover:scale-110 transition-all active:scale-90 shadow-sm"
            >
              {soundOn ? E.loud : E.mute}
            </button>
          </div>
        </header>

        {/* ── MAIN CARD ───────────────────────────────────────────────────── */}
        <main className="w-full max-w-3xl bg-white/95 dark:bg-slate-900/95 border border-gray-200 dark:border-slate-700 rounded-3xl p-5 sm:p-7 shadow-xl relative">
          {/* Category badge */}
          <div className="flex justify-center mb-5">
            <span className="bg-purple-100 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300 px-5 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase">
              {E.folder} {category}
            </span>
          </div>

          {/* Taunt bar */}
          <div className="flex justify-center mb-4 min-h-6">
            {TAUNTS[wrongGuesses] && !isOver && (
              <p
                className={`text-sm font-bold ${nearDeath ? "text-red-500" : "text-gray-400 dark:text-slate-400"}`}
                style={
                  nearDeath ? {animation: "dangerPulse 0.8s ease infinite"} : {}
                }
              >
                {TAUNTS[wrongGuesses]}
              </p>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start">
            {/* LEFT: canvas + lives */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div
                key={shakeKey}
                className="bg-gray-50 dark:bg-slate-50 border border-gray-200 dark:border-slate-200 rounded-2xl p-3 shadow-inner"
                style={shakeKey > 0 ? {animation: "shake 0.45s ease"} : {}}
              >
                <HangmanCanvas wrongGuesses={wrongGuesses} lost={isLost} />
              </div>

              {/* Progress bar */}
              <div className="w-full px-1">
                <div className="flex justify-between text-xs text-gray-400 dark:text-slate-400 mb-1">
                  <span>Mistakes</span>
                  <span
                    className={`font-black ${wrongGuesses >= 5 ? "text-red-500" : "text-gray-700 dark:text-slate-200"}`}
                  >
                    {wrongGuesses} / {MAX_WRONG}
                  </span>
                </div>
                <div className="h-2.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
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
                      className={`w-3 h-3 rounded-full transition-all duration-300 flex items-center justify-center text-white font-black text-xs ${
                        i < wrongGuesses
                          ? "bg-red-400 scale-125"
                          : "bg-gray-200 dark:bg-slate-700"
                      }`}
                    >
                      {i < wrongGuesses ? "x" : ""}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: word + keyboard */}
            <div className="flex-1 w-full flex flex-col gap-5">
              {/* Word blanks */}
              <div className="flex flex-wrap justify-center gap-2 min-h-16">
                {word.split("").map((letter, i) => {
                  const revealed = guessedLetters.has(letter);
                  const justRevealed = revealedLetter === letter;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span
                        className={`text-2xl font-black w-8 inline-block text-center ${
                          revealed
                            ? isLost
                              ? "text-red-500"
                              : "text-emerald-600"
                            : isLost
                              ? "text-red-400/80"
                              : "text-transparent"
                        }`}
                        style={
                          revealed && justRevealed
                            ? {animation: "letterPop 0.35s ease forwards"}
                            : {}
                        }
                      >
                        {revealed || isLost ? letter : "?"}
                      </span>
                      <div
                        className={`h-0.5 w-8 rounded-full transition-colors duration-300 ${
                          revealed
                            ? isLost
                              ? "bg-red-400"
                              : "bg-emerald-500"
                            : "bg-gray-300 dark:bg-slate-600"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Wrong letter badges */}
              <div className="min-h-8 flex flex-wrap justify-center gap-1.5">
                {wrongLetters.length > 0 && (
                  <>
                    <span className="w-full text-center text-gray-400 dark:text-slate-400 text-xs uppercase tracking-widest">
                      {E.skull} Wrong guesses
                    </span>
                    {wrongLetters.map((l) => (
                      <span
                        key={l}
                        className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-500 dark:text-red-300 px-2.5 py-0.5 rounded-md text-sm font-black"
                        style={{animation: "popIn 0.2s ease forwards"}}
                      >
                        {l}
                      </span>
                    ))}
                  </>
                )}
              </div>

              {/* Keyboard */}
              <div className="flex flex-wrap justify-center gap-1.5 max-w-xs mx-auto">
                {ALPHABET.map((letter) => {
                  const isGuessed = guessedLetters.has(letter);
                  const isCorrect = isGuessed && word.includes(letter);
                  const isWrong = isGuessed && !word.includes(letter);
                  return (
                    <button
                      key={letter}
                      onClick={() => handleGuess(letter)}
                      disabled={isGuessed || isOver}
                      className={`w-9 h-9 rounded-xl text-sm font-black transition-all duration-100 border select-none ${
                        isCorrect
                          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-900 cursor-default scale-90"
                          : isWrong
                            ? "bg-red-50 dark:bg-red-950/40 text-red-300 dark:text-red-400 border-red-100 dark:border-red-950 cursor-default opacity-40 scale-90"
                            : isOver
                              ? "bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-500 border-gray-200 dark:border-slate-700 cursor-default"
                              : "bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-600 hover:bg-purple-500 dark:hover:bg-purple-500 hover:text-white hover:border-purple-400 hover:-translate-y-1 hover:scale-110 hover:shadow-md hover:shadow-purple-200 dark:hover:shadow-purple-900/40 active:scale-90 active:translate-y-0 cursor-pointer shadow-sm"
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>

              {/* New game button */}
              <div className="flex justify-center mt-1">
                <button
                  onClick={startNewGame}
                  className="group bg-linear-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white font-black text-sm px-8 py-2.5 rounded-2xl shadow-lg shadow-orange-300/60 dark:shadow-orange-900/30 hover:shadow-orange-400/60 transition-all duration-200 hover:scale-110 active:scale-95 tracking-wider"
                >
                  <span className="inline-block group-hover:animate-[spin_0.5s_linear] mr-1">
                    {E.refresh}
                  </span>{" "}
                  NEW GAME
                </button>
              </div>
            </div>
          </div>
        </main>

        <p className="mt-3 text-gray-400 dark:text-slate-500 text-xs text-center select-none">
          {E.kbd} Tip: Use your physical keyboard too!
        </p>

        {/* ════════════════════════════════════════════════════════════════════
            RESULT OVERLAY — WIN
        ════════════════════════════════════════════════════════════════════ */}
        {showResult && isWon && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
            style={{animation: "backdropFade 0.3s ease forwards"}}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowResult(false);
            }}
          >
            {/* Golden gradient backdrop */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg,rgba(254,240,138,.88) 0%,rgba(251,191,36,.82) 35%,rgba(249,115,22,.75) 65%,rgba(168,85,247,.72) 100%)",
                backdropFilter: "blur(6px)",
              }}
            />

            {/* Confetti rain */}
            {PIECES_DATA.map((p) => (
              <div
                key={p.id}
                style={{
                  position: "fixed",
                  left: `${p.left}%`,
                  top: "-30px",
                  width:
                    p.shape === "circle"
                      ? p.size
                      : p.shape === "diamond"
                        ? p.size * 0.8
                        : p.size,
                  height:
                    p.shape === "circle"
                      ? p.size
                      : p.shape === "diamond"
                        ? p.size * 0.8
                        : p.size * 0.45,
                  borderRadius: p.shape === "circle" ? "50%" : "2px",
                  background: p.color,
                  transform: p.shape === "diamond" ? "rotate(45deg)" : "none",
                  animation: `fallDown ${p.duration}s linear ${p.delay}s infinite`,
                  opacity: 0.88,
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              />
            ))}

            {/* Stars in corners */}
            {STAR_POSITIONS.map((s, i) => (
              <div
                key={i}
                style={{
                  position: "fixed",
                  top: `${s.top}%`,
                  left: `${s.left}%`,
                  fontSize: 16 + (i % 3) * 8,
                  animation: `starFloat ${1.2 + (i % 4) * 0.4}s ease ${(i * 0.18) % 1}s infinite alternate`,
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              >
                {[E.star2, E.sparkles, E.star][i % 3]}
              </div>
            ))}

            {/* ── WIN CARD ─────────────────────────────────────────────── */}
            <div
              className="relative bg-white dark:bg-slate-950 rounded-3xl p-8 text-center max-w-md w-full z-10"
              style={{
                animation:
                  "resultSlideIn 0.55s cubic-bezier(.34,1.56,.64,1) forwards, glowRing 2s ease 0.6s infinite",
              }}
            >
              {/* Trophy animation: bounce wrapper → float inner */}
              <div
                style={{
                  animation:
                    "victoryBounce 0.8s cubic-bezier(.34,1.56,.64,1) forwards",
                }}
              >
                <div
                  className="text-8xl leading-none select-none mx-auto inline-block"
                  style={{
                    animation: "trophyFloat 1.8s ease 0.85s infinite alternate",
                  }}
                >
                  {E.trophy}
                </div>
              </div>

              {/* Crown accent */}
              <div className="flex justify-center gap-2 -mt-1 mb-2">
                <span
                  style={{
                    fontSize: 20,
                    animation: "starFloat 1s ease .1s infinite alternate",
                  }}
                >
                  {E.sparkles}
                </span>
                <span
                  style={{
                    fontSize: 22,
                    animation: "starFloat 1s ease .3s infinite alternate",
                  }}
                >
                  {E.crown}
                </span>
                <span
                  style={{
                    fontSize: 20,
                    animation: "starFloat 1s ease .2s infinite alternate",
                  }}
                >
                  {E.sparkles}
                </span>
              </div>

              {/* WINNER! shimmer text */}
              <div
                style={{
                  background:
                    "linear-gradient(90deg,#f97316,#fbbf24,#f59e0b,#ec4899,#fbbf24,#f97316)",
                  backgroundSize: "400% 100%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  animation: "shimmer 1.8s linear infinite",
                  fontSize: 52,
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  lineHeight: 1.1,
                  marginBottom: 6,
                }}
              >
                WINNER!
              </div>

              {/* Funny win message */}
              <p className="text-gray-600 dark:text-slate-200 font-bold text-base mb-4">
                {resultMsg}
              </p>

              {/* Win streak badge */}
              {winStreak >= 2 && (
                <div
                  className="inline-flex items-center gap-1.5 bg-amber-100 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-900 text-amber-700 dark:text-amber-300 font-black text-sm px-4 py-1.5 rounded-full mb-4"
                  style={{
                    animation:
                      "badgePop 0.5s cubic-bezier(.34,1.56,.64,1) forwards",
                  }}
                >
                  {E.fire} {winStreak} WIN STREAK! {E.fire}
                </div>
              )}

              {/* Word reveal box */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-900 rounded-2xl py-3 px-5 mb-5">
                <p className="text-gray-400 dark:text-slate-400 text-xs uppercase tracking-widest mb-0.5">
                  You solved
                </p>
                <p
                  className="font-black text-2xl tracking-widest"
                  style={{
                    background:
                      "linear-gradient(90deg,#f97316,#ec4899,#a855f7)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {word}
                </p>
                <p className="text-purple-400 dark:text-purple-300 text-xs font-bold uppercase tracking-widest">
                  {category}
                </p>
              </div>

              {/* Stats row */}
              <div className="flex justify-center gap-3 mb-6">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl px-4 py-2 text-center">
                  <div className="text-emerald-600 font-black text-xl">
                    {correctLetters.length}
                  </div>
                  <div className="text-gray-400 dark:text-slate-400 text-xs">
                    {E.check} correct
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-4 py-2 text-center">
                  <div className="text-red-500 font-black text-xl">
                    {wrongGuesses}
                  </div>
                  <div className="text-gray-400 dark:text-slate-400 text-xs">
                    {E.cross} wrong
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-xl px-4 py-2 text-center">
                  <div className="text-purple-600 font-black text-xl">
                    {scores.wins + scores.losses}
                  </div>
                  <div className="text-gray-400 dark:text-slate-400 text-xs">
                    {E.gamepad} played
                  </div>
                </div>
              </div>

              {/* Play again */}
              <button
                onClick={startNewGame}
                className="w-full bg-linear-to-r from-amber-400 via-orange-500 to-pink-600 hover:from-amber-300 hover:to-pink-500 text-white font-black text-lg py-3.5 rounded-2xl shadow-lg shadow-orange-300/70 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                {E.rocket} Play Again
              </button>

              <button
                onClick={() => setShowResult(false)}
                className="mt-3 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-xs transition-colors"
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
            style={{animation: "backdropFade 0.3s ease forwards"}}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowResult(false);
            }}
          >
            {/* Dark red backdrop */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg,rgba(30,0,0,.88) 0%,rgba(127,29,29,.82) 50%,rgba(60,5,40,.85) 100%)",
                backdropFilter: "blur(6px)",
              }}
            />

            {/* Skull particles in background */}
            {PIECES_DATA.slice(0, 20).map((p) => (
              <div
                key={p.id}
                style={{
                  position: "fixed",
                  left: `${p.left}%`,
                  top: "-20px",
                  fontSize: p.size + 8,
                  animation: `fallDown ${p.duration + 1}s linear ${p.delay}s infinite`,
                  opacity: 0.25,
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              >
                {E.skull}
              </div>
            ))}

            {/* ── LOSE CARD ────────────────────────────────────────────── */}
            <div
              className="relative bg-gray-950 border-2 border-red-800 rounded-3xl p-8 text-center max-w-md w-full z-10 shadow-2xl"
              style={{
                animation:
                  "resultSlideIn 0.55s cubic-bezier(.34,1.56,.64,1) forwards",
                boxShadow:
                  "0 0 0 2px #7f1d1d, 0 0 50px rgba(239,68,68,.3), 0 25px 60px rgba(0,0,0,.6)",
              }}
            >
              {/* Skull */}
              <div
                className="text-8xl leading-none select-none mb-2 inline-block"
                style={{
                  animation:
                    "loseSlam 0.7s cubic-bezier(.34,1.56,.64,1) forwards, loseShake 0.5s ease 0.75s 2",
                }}
              >
                {E.skull}
              </div>

              {/* GAME OVER */}
              <div
                className="font-black tracking-widest mb-2"
                style={{
                  fontSize: 44,
                  color: "#dc2626",
                  textShadow: "0 0 20px #ef4444, 0 0 40px #dc2626",
                  animation: "dangerPulse 1s ease infinite",
                }}
              >
                GAME OVER
              </div>

              <p className="text-red-400 font-bold text-base mb-5">
                {resultMsg}
              </p>

              {/* Word reveal */}
              <div className="bg-red-950 border border-red-800 rounded-2xl py-3 px-5 mb-5">
                <p className="text-red-400 text-xs uppercase tracking-widest mb-0.5">
                  The word was
                </p>
                <p className="text-red-300 font-black text-2xl tracking-widest">
                  {word}
                </p>
                <p className="text-red-600 text-xs font-bold uppercase tracking-widest">
                  {category}
                </p>
              </div>

              {/* Stats */}
              <div className="flex justify-center gap-3 mb-6">
                <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-center">
                  <div className="text-emerald-500 font-black text-xl">
                    {correctLetters.length}
                  </div>
                  <div className="text-gray-500 text-xs">{E.check} correct</div>
                </div>
                <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-center">
                  <div className="text-red-500 font-black text-xl">
                    {wrongGuesses}
                  </div>
                  <div className="text-gray-500 text-xs">{E.cross} wrong</div>
                </div>
                <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-center">
                  <div className="text-purple-400 font-black text-xl">
                    {scores.wins + scores.losses}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {E.gamepad} played
                  </div>
                </div>
              </div>

              {/* Try again */}
              <button
                onClick={startNewGame}
                className="w-full bg-linear-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-lg py-3.5 rounded-2xl shadow-lg shadow-red-900/60 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                {E.refresh} Try Again
              </button>

              <button
                onClick={() => setShowResult(false)}
                className="mt-3 text-gray-600 hover:text-gray-400 text-xs transition-colors"
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
