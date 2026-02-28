import {useEffect, useRef, useCallback} from "react";

// ═══════════════════════════════════════════════════════════════
//  ANIMATED HANGMAN v3 — FULLY INTERACTIVE & FUNNY
//  • Physics-based rope with pendulum sway + tension
//  • 7 moods with unique face expressions
//  • Thought bubbles that cycle funny phrases
//  • Floating emoji reactions
//  • Eye-tracking (eyes follow a wandering fly)
//  • Idle fidgets (head tilt, finger tap, foot wiggle)
//  • Dramatic death: body drops, ghost rises, rain + lightning
//  • Victory: disco dance, confetti, sparkle trail, crowd cheers
//  • Gallows with creaking animation
// ═══════════════════════════════════════════════════════════════

const W = 300,
  H = 360;
const TAU = Math.PI * 2;

// ── Colors ────────────────────────────────────────────────────
const C = {
  pole: "#334155",
  poleHi: "#475569",
  rope: "#fbbf24",
  ropeGlow: "#f59e0b",
  head: "#f97316",
  headHi: "#fb923c",
  body: "#a78bfa",
  bodyHi: "#c4b5fd",
  arm: "#34d399",
  armHi: "#6ee7b7",
  leg: "#60a5fa",
  legHi: "#93c5fd",
  hand: "#34d399",
  shoe: "#3b82f6",
  heart: "#f472b6",
  sweat: "#38bdf8",
  tear: "#60a5fa",
  dead: "#ef4444",
  deadGlow: "#fca5a5",
  ghost: "#e2e8f0",
  ghostEye: "#475569",
  ground: "rgba(30,41,59,0.35)",
  bubble: "#fefce8",
  bubbleBorder: "#fde047",
  // confetti palette
  conf: [
    "#ef4444",
    "#22c55e",
    "#3b82f6",
    "#eab308",
    "#a855f7",
    "#f97316",
    "#ec4899",
    "#14b8a6",
  ],
};

// ── Anchors ───────────────────────────────────────────────────
const BASE_X = 210;
const A = {
  ropeTop: {x: BASE_X, y: 28},
  headCtr: {x: BASE_X, y: 118},
  headR: 24,
  neckY: 142,
  shoulderY: 165,
  bodyBot: {x: BASE_X, y: 225},
  hipY: 225,
  lArm: {x: 168, y: 205},
  rArm: {x: 252, y: 205},
  lLeg: {x: 170, y: 285},
  rLeg: {x: 250, y: 285},
};

// ── Funny speech lines per mistake count ─────────────────────
const SPEECH_LINES = {
  0: [],
  1: [
    "Oh... hi 😐",
    "Just a scratch",
    "I barely felt that",
    "Hmm, not great",
    "That's... fine",
  ],
  2: [
    "Bruh 😅",
    "Not my best day",
    "I'm sweating a little",
    "Easy there buddy",
    "Think harder!",
  ],
  3: [
    "Srs!? 😰",
    "My arm hurts!",
    "I need that arm!",
    "Watch it pal",
    "Getting nervous...",
  ],
  4: [
    "STOP 😱",
    "TWO ARMS?!",
    "This is NOT okay",
    "I'm too young!",
    "Can we talk?!",
  ],
  5: [
    "OH NO 😭",
    "My legs!!",
    "Someone save me!",
    "I regret this",
    "MAYDAY MAYDAY!",
  ],
};

// Floating emoji reactions per mistake
const REACTION_EMOJIS = ["", "😐", "😅", "😨", "🫣", "😱", "💀"];

// ── Helpers ───────────────────────────────────────────────────
function glow(ctx, color, lw = 4, blur = 10) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function fill(ctx, color, blur = 6) {
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ══════════════════════════════════════════════════════════════
//  GALLOWS — with subtle creak
// ══════════════════════════════════════════════════════════════
function drawGallows(ctx, t, wrongGuesses) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const creak = wrongGuesses > 0 ? Math.sin(t * 0.8) * 0.3 : 0;

  // Ground shadow
  const grd = ctx.createLinearGradient(15, 318, 205, 330);
  grd.addColorStop(0, "rgba(30,41,59,0)");
  grd.addColorStop(0.5, C.ground);
  grd.addColorStop(1, "rgba(30,41,59,0)");
  ctx.strokeStyle = grd;
  ctx.lineWidth = 8;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(15, 322);
  ctx.lineTo(205, 322);
  ctx.stroke();

  // Base platform
  ctx.strokeStyle = C.pole;
  ctx.lineWidth = 6;
  ctx.shadowColor = "rgba(30,41,59,0.12)";
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.moveTo(35, 320);
  ctx.lineTo(115, 320);
  ctx.stroke();

  // Vertical pole
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(75, 320);
  ctx.lineTo(75, 27 + creak);
  ctx.stroke();

  // Top beam
  ctx.beginPath();
  ctx.moveTo(73, 28 + creak);
  ctx.lineTo(BASE_X + 3, 28 + creak);
  ctx.stroke();

  // Support brace
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = C.poleHi;
  ctx.beginPath();
  ctx.moveTo(75, 85);
  ctx.lineTo(108, 28 + creak);
  ctx.stroke();

  // Nail details
  ctx.fillStyle = "#94a3b8";
  ctx.shadowBlur = 0;
  [
    {x: 75, y: 320},
    {x: 75, y: 28 + creak},
    {x: BASE_X, y: 28 + creak},
  ].forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, TAU);
    ctx.fill();
  });

  ctx.restore();
  return creak;
}

// ══════════════════════════════════════════════════════════════
//  ROPE — physics pendulum with knot + tension stretch
// ══════════════════════════════════════════════════════════════
function drawRope(ctx, t, wrongGuesses, creak, mood) {
  if (wrongGuesses === 0) return {swing: 0, ropeEndY: 94};
  ctx.save();

  // Pendulum physics: more sway = more guesses
  const freq = 1.0 + mood * 0.3;
  const amp = 2 + mood * 1.5;
  const swing = Math.sin(t * freq) * amp;

  // Tension: rope stretches slightly with more body parts
  const tension = wrongGuesses * 1.2;
  const ropeBaseY = 94 + tension;

  // Rope segments (catenary-like curve)
  glow(ctx, C.rope, 3, 8);
  ctx.beginPath();
  ctx.moveTo(A.ropeTop.x, A.ropeTop.y + creak);
  const midY = (A.ropeTop.y + creak + ropeBaseY) / 2;
  ctx.bezierCurveTo(
    A.ropeTop.x + swing * 0.3,
    midY - 8,
    A.ropeTop.x + swing * 0.7,
    midY + 8,
    A.ropeTop.x + swing,
    ropeBaseY,
  );
  ctx.stroke();

  // Rope texture lines
  ctx.strokeStyle = C.ropeGlow;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;
  ctx.shadowBlur = 0;
  for (let i = 0; i < 6; i++) {
    const frac = (i + 1) / 7;
    const xx = A.ropeTop.x + swing * frac;
    const yy = lerp(A.ropeTop.y + creak, ropeBaseY, frac);
    ctx.beginPath();
    ctx.moveTo(xx - 2, yy - 1.5);
    ctx.lineTo(xx + 2, yy + 1.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Noose knot
  glow(ctx, C.rope, 2.5, 5);
  ctx.beginPath();
  ctx.arc(A.ropeTop.x + swing, ropeBaseY + 3, 7, 0, TAU);
  ctx.stroke();

  // Inner knot detail
  ctx.beginPath();
  ctx.arc(A.ropeTop.x + swing + 2, ropeBaseY + 1, 3, 0, TAU);
  ctx.stroke();

  ctx.restore();
  return {swing, ropeEndY: ropeBaseY};
}

// ══════════════════════════════════════════════════════════════
//  WANDERING FLY (for eye tracking)
// ══════════════════════════════════════════════════════════════
function getFlyPos(t) {
  const fx = BASE_X + Math.sin(t * 0.7) * 50 + Math.cos(t * 1.3) * 30;
  const fy = 100 + Math.sin(t * 1.1) * 40 + Math.cos(t * 0.5) * 20;
  return {fx, fy};
}

function drawFly(ctx, t) {
  const {fx, fy} = getFlyPos(t);
  ctx.save();
  ctx.fillStyle = "#1e293b";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.ellipse(fx, fy, 2, 1.5, 0, 0, TAU);
  ctx.fill();
  // Wings
  ctx.fillStyle = "rgba(148,163,184,0.5)";
  const wingFlap = Math.sin(t * 40) * 0.3;
  ctx.beginPath();
  ctx.ellipse(fx - 2, fy - 2, 3, 1.5, -0.5 + wingFlap, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(fx + 2, fy - 2, 3, 1.5, 0.5 - wingFlap, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  HEAD — with eye tracking, progressive expressions, tilt
// ══════════════════════════════════════════════════════════════
function drawHead(ctx, t, mood, blinkT, swing, ropeEndY) {
  ctx.save();
  const bob = Math.sin(t * 2) * 2;
  const tilt =
    mood >= 4
      ? Math.sin(t * 12) * 0.08
      : mood >= 2
        ? Math.sin(t * 1.5) * 0.04
        : Math.sin(t * 0.8) * 0.015;
  const cx = A.headCtr.x + swing;
  const cy = ropeEndY + A.headR + 3 + bob;
  const r = A.headR;

  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.translate(-cx, -cy);

  // Danger ring (mood >= 3)
  if (mood >= 3) {
    ctx.save();
    glow(ctx, C.dead, 2, 10);
    ctx.globalAlpha = 0.25 + Math.sin(t * 8) * 0.2;
    ctx.setLineDash([3, 5]);
    const dashOff = (t * 30) % 16;
    ctx.lineDashOffset = dashOff;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Head circle
  glow(ctx, mood >= 4 ? C.dead : C.head, 4, 12);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();

  // Cheek blush for low moods
  if (mood <= 1) {
    ctx.save();
    ctx.fillStyle = "rgba(251,146,60,0.15)";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cx - 14, cy + 6, 5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 14, cy + 6, 5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // FACE
  const isBlink = blinkT < 0.12;
  const {fx: flyX, fy: flyY} = getFlyPos(t);
  const lookX = Math.min(2, Math.max(-2, (flyX - cx) * 0.03));
  const lookY = Math.min(1.5, Math.max(-1.5, (flyY - cy) * 0.03));

  if (mood === 0) {
    drawTrackingEyes(ctx, cx, cy, 3, isBlink, C.head, lookX, lookY, false);
    drawBigSmile(ctx, cx, cy + 5, t);
  } else if (mood === 1) {
    drawTrackingEyes(ctx, cx, cy, 3, isBlink, C.head, lookX, lookY, false);
    drawFlatMouth(ctx, cx, cy + 10);
  } else if (mood === 2) {
    drawTrackingEyes(
      ctx,
      cx,
      cy,
      4,
      isBlink,
      C.head,
      lookX * 0.5,
      lookY * 0.5,
      true,
    );
    drawSquigglyMouth(ctx, cx, cy + 10, t);
    drawSweatDrop(ctx, cx + r + 3, cy - 8, t);
  } else if (mood === 3) {
    drawWideEyes(ctx, cx, cy, 5, C.head);
    drawOMouth(ctx, cx, cy + 11, t);
    drawSweatDrop(ctx, cx + r + 2, cy - 10, t);
    drawSweatDrop(ctx, cx + r + 7, cy, t + 1);
  } else if (mood === 4) {
    const shake = Math.sin(t * 22) * 3;
    drawWideEyes(ctx, cx + shake, cy, 5.5, C.dead);
    drawScreamMouth(ctx, cx, cy + 10, t);
    drawSweatDrop(ctx, cx + r + 2, cy - 12, t);
    drawSweatDrop(ctx, cx + r + 7, cy - 2, t + 0.6);
    drawSweatDrop(ctx, cx - r - 5, cy - 6, t + 1.2);
    drawSweatDrop(ctx, cx - r - 2, cy + 4, t + 1.8);
  } else {
    drawXEyes(ctx, cx, cy, t);
    drawTears(ctx, cx, cy + 4, t);
    drawDeadMouth(ctx, cx, cy + 11);
    // Halo
    ctx.save();
    glow(ctx, "#fde047", 1.5, 8);
    ctx.beginPath();
    ctx.ellipse(cx, cy - r - 6, 14, 4, Math.sin(t * 0.5) * 0.15, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // Eyebrows
  if (mood >= 1 && mood <= 4) {
    ctx.save();
    ctx.strokeStyle = mood >= 3 ? C.dead : C.head;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    const brow = mood >= 3 ? 4 : 2;
    // Left eyebrow (worried = slanted up)
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 10 - brow);
    ctx.lineTo(cx - 3, cy - 9);
    ctx.stroke();
    // Right
    ctx.beginPath();
    ctx.moveTo(cx + 12, cy - 10 - brow);
    ctx.lineTo(cx + 3, cy - 9);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
  return {cx, cy: A.headCtr.y + bob, bob, tilt};
}

// ── Eye variants ─────────────────────────────────────────────
function drawTrackingEyes(ctx, cx, cy, r, blink, color, lx, ly, showPupil) {
  const elx = cx - 7,
    erx = cx + 7,
    ey = cy - 4;
  ctx.save();
  fill(ctx, color, 4);
  if (blink) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 2;
    ctx.beginPath();
    ctx.moveTo(elx - r, ey);
    ctx.lineTo(elx + r, ey);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(erx - r, ey);
    ctx.lineTo(erx + r, ey);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(elx, ey, r, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(erx, ey, r, 0, TAU);
    ctx.fill();
    // Tracking pupil
    ctx.fillStyle = "#1e293b";
    ctx.shadowBlur = 0;
    const pr = showPupil ? 2.2 : 1.5;
    ctx.beginPath();
    ctx.arc(elx + lx, ey + ly, pr, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(erx + lx, ey + ly, pr, 0, TAU);
    ctx.fill();
    // Eye shine
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(elx - 1, ey - 1, 1, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(erx - 1, ey - 1, 1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawWideEyes(ctx, cx, cy, r, color) {
  const elx = cx - 7,
    erx = cx + 7,
    ey = cy - 4;
  ctx.save();
  // White sclera
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(elx, ey, r, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(erx, ey, r, 0, TAU);
  ctx.fill();
  // Colored iris
  fill(ctx, color, 3);
  ctx.beginPath();
  ctx.arc(elx, ey, r * 0.65, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(erx, ey, r * 0.65, 0, TAU);
  ctx.fill();
  // Pupil
  ctx.fillStyle = "#1e293b";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(elx, ey + 0.5, 2, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(erx, ey + 0.5, 2, 0, TAU);
  ctx.fill();
  // Outline
  glow(ctx, color, 1.5, 4);
  ctx.beginPath();
  ctx.arc(elx, ey, r, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(erx, ey, r, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawXEyes(ctx, cx, cy, t) {
  const ey = cy - 4;
  const spin = t * 2;
  ctx.save();
  glow(ctx, C.dead, 2.5, 8);
  [cx - 7, cx + 7].forEach((ex) => {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(spin % TAU);
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(4, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, -4);
    ctx.lineTo(-4, 4);
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

// ── Mouth variants ───────────────────────────────────────────
function drawBigSmile(ctx, cx, cy, t) {
  ctx.save();
  glow(ctx, C.head, 2.5, 6);
  const w = 8 + Math.sin(t * 2) * 1;
  ctx.beginPath();
  ctx.arc(cx, cy, w, 0.15, Math.PI - 0.15);
  ctx.stroke();
  // Tooth
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 0;
  ctx.fillRect(cx - 2, cy + 2, 4, 3);
  ctx.restore();
}

function drawFlatMouth(ctx, cx, cy) {
  ctx.save();
  glow(ctx, C.head, 2, 4);
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy);
  ctx.lineTo(cx + 7, cy);
  ctx.stroke();
  ctx.restore();
}

function drawSquigglyMouth(ctx, cx, cy, t) {
  ctx.save();
  glow(ctx, C.head, 2, 4);
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy);
  for (let i = -8; i <= 8; i += 0.5) {
    ctx.lineTo(cx + i, cy + Math.sin((i + t * 5) * 0.8) * 3);
  }
  ctx.stroke();
  ctx.restore();
}

function drawOMouth(ctx, cx, cy, t) {
  ctx.save();
  const pulse = 1 + Math.sin(t * 6) * 0.2;
  glow(ctx, C.head, 2, 6);
  ctx.beginPath();
  ctx.ellipse(cx, cy, 4 * pulse, 5.5 * pulse, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawScreamMouth(ctx, cx, cy, t) {
  ctx.save();
  const open = 6 + Math.sin(t * 10) * 2;
  // Mouth opening
  fill(ctx, "#1e293b", 0);
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 7, open, 0, 0, TAU);
  ctx.fill();
  // Lips
  glow(ctx, C.dead, 2, 4);
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 7, open, 0, 0, TAU);
  ctx.stroke();
  // Uvula
  fill(ctx, "#f87171", 0);
  ctx.beginPath();
  ctx.arc(cx, cy + open - 1, 2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawDeadMouth(ctx, cx, cy) {
  ctx.save();
  glow(ctx, C.head, 2.5, 6);
  ctx.beginPath();
  ctx.moveTo(cx - 9, cy + 3);
  ctx.bezierCurveTo(cx - 5, cy - 4, cx + 5, cy - 4, cx + 9, cy + 3);
  ctx.stroke();
  ctx.restore();
}

// ── Sweat & Tears ────────────────────────────────────────────
function drawSweatDrop(ctx, x, y, t) {
  ctx.save();
  const cycle = (t * 35) % 18;
  const alpha = 1 - cycle / 18;
  ctx.globalAlpha = alpha;
  fill(ctx, C.sweat, 4);
  // Teardrop shape
  ctx.beginPath();
  ctx.moveTo(x, y + cycle - 3);
  ctx.quadraticCurveTo(x + 3.5, y + cycle + 2, x, y + cycle + 5);
  ctx.quadraticCurveTo(x - 3.5, y + cycle + 2, x, y + cycle - 3);
  ctx.fill();
  ctx.restore();
}

function drawTears(ctx, cx, cy, t) {
  ctx.save();
  [cx - 7, cx + 7].forEach((ex, i) => {
    const off = i * 0.6;
    for (let j = 0; j < 3; j++) {
      const drop = ((t + off + j * 0.4) * 45) % 25;
      const alpha = 1 - drop / 25;
      ctx.globalAlpha = alpha;
      fill(ctx, C.tear, 3);
      ctx.beginPath();
      ctx.ellipse(ex + Math.sin(drop * 0.3) * 1.5, cy + drop, 2, 3, 0, 0, TAU);
      ctx.fill();
    }
  });
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  BODY — breathing, belly laughing, heartbeat
// ══════════════════════════════════════════════════════════════
function drawBody(ctx, t, headBob, swing, ropeEndY, mood) {
  ctx.save();
  const breathe = Math.sin(t * 2.5) * (mood >= 3 ? 2.5 : 1.2);
  const cx = A.headCtr.x + swing;
  const neckY = ropeEndY + A.headR * 2 + 4 + headBob;
  const hipY = neckY + 83 + breathe;

  glow(ctx, C.body, 4, 10);
  // Slight body curve (not straight)
  ctx.beginPath();
  ctx.moveTo(cx, neckY);
  ctx.quadraticCurveTo(
    cx + Math.sin(t * 1.8) * 2,
    (neckY + hipY) / 2,
    cx + swing * 0.1,
    hipY,
  );
  ctx.stroke();

  // Heart beat
  const rate = mood >= 4 ? 14 : mood >= 2 ? 7 : 4;
  const beat = 1 + Math.sin(t * rate) * (mood >= 3 ? 0.3 : 0.15);
  ctx.save();
  ctx.translate(cx - 7, neckY + 28);
  ctx.scale(beat, beat);
  fill(ctx, C.heart, mood >= 3 ? 14 : 8);
  ctx.font = `${mood >= 3 ? 14 : 12}px serif`;
  ctx.fillText("♥", 0, 0);
  ctx.restore();

  // Belt/waist detail
  ctx.save();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(cx - 8, hipY - 2);
  ctx.lineTo(cx + 8, hipY - 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
  return {breathe, neckY, hipY};
}

// ══════════════════════════════════════════════════════════════
//  ARMS — with finger tap idle, panic flailing, hand detail
// ══════════════════════════════════════════════════════════════
function drawLeftArm(ctx, t, bodyInfo, swing, mood) {
  ctx.save();
  const {neckY} = bodyInfo;
  const shoulderY = neckY + 23;
  const sx = A.headCtr.x + swing;

  const wave = mood >= 3 ? Math.sin(t * 9) * 15 : Math.sin(t * 1.5) * 5;
  const flail = mood >= 4 ? Math.cos(t * 7) * 8 : 0;

  glow(ctx, C.arm, 3.5, 8);
  const endX = A.lArm.x + flail + (mood >= 3 ? Math.sin(t * 6) * 6 : 0);
  const endY = A.lArm.y + wave * 0.5;
  ctx.beginPath();
  ctx.moveTo(sx, shoulderY);
  ctx.quadraticCurveTo(sx - 18, shoulderY + 22, endX, endY);
  ctx.stroke();

  // Hand with fingers
  drawHand(ctx, endX - 3, endY + 2, t, mood, -1);
  ctx.restore();
}

function drawRightArm(ctx, t, bodyInfo, swing, mood) {
  ctx.save();
  const {neckY} = bodyInfo;
  const shoulderY = neckY + 23;
  const sx = A.headCtr.x + swing;

  const wave =
    mood >= 3 ? Math.sin(t * 9 + 1.5) * 15 : Math.sin(t * 1.5 + Math.PI) * 5;
  const flail = mood >= 4 ? Math.cos(t * 7 + 1) * 8 : 0;

  glow(ctx, C.arm, 3.5, 8);
  const endX = A.rArm.x + flail + (mood >= 3 ? Math.sin(t * 6 + 1) * 6 : 0);
  const endY = A.rArm.y + wave * 0.5;
  ctx.beginPath();
  ctx.moveTo(sx, shoulderY);
  ctx.quadraticCurveTo(sx + 18, shoulderY + 22, endX, endY);
  ctx.stroke();

  drawHand(ctx, endX + 3, endY + 2, t, mood, 1);
  ctx.restore();
}

function drawHand(ctx, x, y, t, mood, dir) {
  ctx.save();
  fill(ctx, C.hand, 5);
  // Palm
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, TAU);
  ctx.fill();

  // Fingers (3 little lines)
  ctx.strokeStyle = C.hand;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 0;
  const fingerWave =
    mood >= 3 ? Math.sin(t * 12 + dir) * 3 : Math.sin(t * 2 + dir) * 1;
  for (let i = -1; i <= 1; i++) {
    const angle = i * 0.4 + dir * 0.2;
    const fx = x + Math.cos(angle) * (6 + fingerWave * (i === 0 ? 1 : 0.5));
    const fy = y + Math.sin(angle) * 4 + 3;
    ctx.beginPath();
    ctx.moveTo(x + i * 2, y + 3);
    ctx.lineTo(fx, fy);
    ctx.stroke();
  }
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  LEGS — kicking, foot tapping idle, shoe laces
// ══════════════════════════════════════════════════════════════
function drawLeftLeg(ctx, t, bodyInfo, swing, mood) {
  ctx.save();
  const {hipY, breathe} = bodyInfo;
  const hx = A.headCtr.x + swing * 0.9;

  const kick = mood >= 4 ? Math.sin(t * 11) * 14 : Math.sin(t * 1.3) * 4;
  glow(ctx, C.leg, 3.5, 8);
  const endX = A.lLeg.x + kick;
  const endY = A.lLeg.y + breathe * 0.4;
  ctx.beginPath();
  ctx.moveTo(hx, hipY);
  ctx.quadraticCurveTo(hx - 16, hipY + 35, endX, endY);
  ctx.stroke();

  drawShoe(ctx, endX - 5, endY + 3, -0.25, t, mood);
  ctx.restore();
}

function drawRightLeg(ctx, t, bodyInfo, swing, mood) {
  ctx.save();
  const {hipY, breathe} = bodyInfo;
  const hx = A.headCtr.x + swing * 0.9;

  const kick =
    mood >= 4 ? Math.sin(t * 11 + 2) * 14 : Math.sin(t * 1.3 + Math.PI) * 4;
  glow(ctx, C.leg, 3.5, 8);
  const endX = A.rLeg.x + kick;
  const endY = A.rLeg.y + breathe * 0.4;
  ctx.beginPath();
  ctx.moveTo(hx, hipY);
  ctx.quadraticCurveTo(hx + 16, hipY + 35, endX, endY);
  ctx.stroke();

  drawShoe(ctx, endX + 5, endY + 3, 0.25, t, mood);
  ctx.restore();
}

function drawShoe(ctx, x, y, rot, t, mood) {
  ctx.save();
  fill(ctx, C.shoe, 6);
  ctx.beginPath();
  ctx.ellipse(x, y, 11, 5.5, rot, 0, TAU);
  ctx.fill();
  // Sole
  ctx.fillStyle = "#1e3a5f";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 10, 2, rot, 0, Math.PI);
  ctx.fill();
  // Lace
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 2);
  ctx.lineTo(x + 3, y - 2);
  ctx.stroke();
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  SPEECH BUBBLE — rotating funny phrases
// ══════════════════════════════════════════════════════════════
function drawSpeechBubble(ctx, wrongGuesses, cx, cy, t) {
  const lines = SPEECH_LINES[wrongGuesses];
  if (!lines || lines.length === 0) return;

  const idx = Math.floor((t * 0.3) % lines.length);
  const text = lines[idx];

  ctx.save();
  ctx.font = "bold 10.5px system-ui, sans-serif";
  const tw = ctx.measureText(text).width;
  const pw = tw + 18;
  const ph = 26;
  const bx = cx + 34;
  const by = cy - 44;
  const wobble = Math.sin(t * 3.5) * 1.5;

  // Thought dots (3 circles leading to bubble)
  fill(ctx, C.bubble, 4);
  ctx.beginPath();
  ctx.arc(cx + 16, cy - 16, 3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 22, cy - 24, 4, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 28, cy - 33, 5, 0, TAU);
  ctx.fill();

  // Bubble
  ctx.shadowColor = "rgba(253,224,71,0.3)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = C.bubble;
  ctx.beginPath();
  ctx.roundRect(bx - pw / 2, by - ph / 2 + wobble, pw, ph, 12);
  ctx.fill();

  // Border
  ctx.strokeStyle = C.bubbleBorder;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.roundRect(bx - pw / 2, by - ph / 2 + wobble, pw, ph, 12);
  ctx.stroke();

  // Text
  ctx.fillStyle = "#1e293b";
  ctx.shadowBlur = 0;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, bx, by + wobble);
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  FLOATING EMOJI REACTIONS
// ══════════════════════════════════════════════════════════════
function createFloatingEmojis() {
  return [];
}

function spawnEmoji(emojis, emoji, x, y) {
  emojis.push({
    emoji,
    x: x + (Math.random() - 0.5) * 20,
    y,
    vy: -1.5 - Math.random() * 1,
    vx: (Math.random() - 0.5) * 1.5,
    life: 1,
    decay: 0.012 + Math.random() * 0.008,
    size: 14 + Math.random() * 6,
    rot: (Math.random() - 0.5) * 0.5,
  });
}

function drawFloatingEmojis(ctx, emojis) {
  for (let i = emojis.length - 1; i >= 0; i--) {
    const e = emojis[i];
    e.x += e.vx;
    e.y += e.vy;
    e.life -= e.decay;
    e.rot += 0.02;
    if (e.life <= 0) {
      emojis.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = e.life;
    ctx.translate(e.x, e.y);
    ctx.rotate(Math.sin(e.rot) * 0.3);
    ctx.font = `${e.size}px serif`;
    ctx.textAlign = "center";
    ctx.fillText(e.emoji, 0, 0);
    ctx.restore();
  }
}

// ══════════════════════════════════════════════════════════════
//  CONFETTI — more shapes, ribbons, stars
// ══════════════════════════════════════════════════════════════
function createConfetti() {
  return Array.from({length: 60}, () => {
    const shapes = ["rect", "circle", "star", "ribbon"];
    return {
      x: Math.random() * W,
      y: -10 - Math.random() * 80,
      vy: 1.2 + Math.random() * 2.5,
      vx: (Math.random() - 0.5) * 2.5,
      size: 3 + Math.random() * 6,
      color: C.conf[Math.floor(Math.random() * C.conf.length)],
      rot: Math.random() * TAU,
      vr: (Math.random() - 0.5) * 0.2,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      wobble: Math.random() * TAU,
      wobbleSpeed: 2 + Math.random() * 3,
    };
  });
}

function drawConfetti(ctx, particles, t) {
  particles.forEach((p) => {
    p.y += p.vy;
    p.x += p.vx + Math.sin(t * p.wobbleSpeed + p.wobble) * 0.5;
    p.rot += p.vr;
    if (p.y > H + 15) {
      p.y = -10;
      p.x = Math.random() * W;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 3;
    if (p.shape === "rect") {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else if (p.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, TAU);
      ctx.fill();
    } else if (p.shape === "star") {
      drawMiniStar(ctx, 0, 0, p.size / 2);
    } else {
      // Ribbon
      ctx.fillRect(-p.size / 2, -1, p.size, 2.5);
      ctx.fillRect(-p.size / 3, -p.size / 3, 2, p.size / 1.5);
    }
    ctx.restore();
  });
}

function drawMiniStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * TAU) / 5 - Math.PI / 2;
    const outerX = x + Math.cos(angle) * r;
    const outerY = y + Math.sin(angle) * r;
    i === 0 ? ctx.moveTo(outerX, outerY) : ctx.lineTo(outerX, outerY);
    const innerAngle = angle + Math.PI / 5;
    ctx.lineTo(
      x + Math.cos(innerAngle) * r * 0.4,
      y + Math.sin(innerAngle) * r * 0.4,
    );
  }
  ctx.closePath();
  ctx.fill();
}

// ══════════════════════════════════════════════════════════════
//  GHOST — bigger, funnier, with speech
// ══════════════════════════════════════════════════════════════
function drawGhost(ctx, t, deathTime) {
  const elapsed = t - deathTime;
  if (elapsed < 0) return;
  const rise = Math.min(elapsed * 25, 90);
  const alpha = Math.max(0, 1 - elapsed * 0.3);
  if (alpha <= 0) return;

  const gx = A.headCtr.x;
  const gy = A.headCtr.y - rise;
  const wobble = Math.sin(t * 4) * 6;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Ghost glow
  const grad = ctx.createRadialGradient(
    gx + wobble,
    gy,
    2,
    gx + wobble,
    gy,
    25,
  );
  grad.addColorStop(0, "rgba(226,232,240,0.4)");
  grad.addColorStop(1, "rgba(226,232,240,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(gx + wobble - 30, gy - 25, 60, 50);

  // Ghost body
  fill(ctx, C.ghost, 12);
  ctx.beginPath();
  ctx.arc(gx + wobble, gy, 16, Math.PI, 0);
  ctx.lineTo(gx + 16 + wobble, gy + 22);
  for (let i = 16; i >= -16; i -= 4) {
    const wave = Math.sin(i * 0.5 + t * 8) * 4;
    ctx.lineTo(gx + i + wobble, gy + 22 + wave);
  }
  ctx.closePath();
  ctx.fill();

  // Eyes
  ctx.fillStyle = C.ghostEye;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.ellipse(gx - 5 + wobble, gy - 2, 3, 4, 0, 0, TAU);
  ctx.ellipse(gx + 5 + wobble, gy - 2, 3, 4, 0, 0, TAU);
  ctx.fill();
  // Pupils
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(gx - 5 + wobble, gy - 3, 1.2, 0, TAU);
  ctx.arc(gx + 5 + wobble, gy - 3, 1.2, 0, TAU);
  ctx.fill();
  // Mouth
  ctx.fillStyle = C.ghostEye;
  ctx.beginPath();
  ctx.ellipse(gx + wobble, gy + 7, 4, 3, 0, 0, TAU);
  ctx.fill();

  // Ghost speech
  if (elapsed > 0.5 && alpha > 0.3) {
    const ghostLines = [
      "gg no re 💀",
      "bruh...",
      "told ya",
      "skill issue",
      "worth it? nah",
    ];
    const gIdx = Math.floor((t * 0.4) % ghostLines.length);
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.fillStyle = `rgba(148,163,184,${alpha})`;
    ctx.textAlign = "center";
    ctx.fillText(ghostLines[gIdx], gx + wobble, gy - 22);
  }

  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  VICTORY DANCE — disco, breakdance, party
// ══════════════════════════════════════════════════════════════
function drawVictoryPose(ctx, t) {
  ctx.save();
  const cx = A.headCtr.x;
  const dance = Math.sin(t * 6) * 7;
  const bounce = Math.abs(Math.sin(t * 4.5)) * 10;
  const baseY = A.headCtr.y - bounce;

  // Disco floor shimmer
  ctx.save();
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 6; i++) {
    const x = 140 + i * 22;
    const hue = (t * 60 + i * 40) % 360;
    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
    ctx.fillRect(x, 310, 18, 12);
  }
  ctx.restore();

  // Sparkle trail
  for (let i = 0; i < 5; i++) {
    const delay = i * 0.12;
    const trailT = t - delay;
    const tx = cx + Math.sin(trailT * 6) * 7 * 0.3;
    const ty = A.headCtr.y - Math.abs(Math.sin(trailT * 4.5)) * 10;
    ctx.save();
    ctx.globalAlpha = 0.3 - i * 0.06;
    ctx.fillStyle = C.conf[i % C.conf.length];
    ctx.shadowColor = C.conf[i % C.conf.length];
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(tx, ty - 10, 2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // Head
  glow(ctx, C.head, 4, 14);
  ctx.beginPath();
  ctx.arc(cx + dance * 0.3, baseY, A.headR, 0, TAU);
  ctx.stroke();

  // Sunglasses 😎
  ctx.save();
  ctx.fillStyle = "#1e293b";
  ctx.shadowBlur = 0;
  const sx = cx + dance * 0.3;
  // Frames
  ctx.fillRect(sx - 15, baseY - 8, 12, 8);
  ctx.fillRect(sx + 3, baseY - 8, 12, 8);
  // Bridge
  ctx.fillRect(sx - 3, baseY - 6, 6, 3);
  // Lens shine
  ctx.fillStyle = "rgba(96,165,250,0.4)";
  ctx.fillRect(sx - 14, baseY - 7, 5, 3);
  ctx.fillRect(sx + 4, baseY - 7, 5, 3);
  ctx.restore();

  // Big open-mouth smile
  glow(ctx, C.head, 3, 8);
  ctx.beginPath();
  ctx.arc(cx + dance * 0.3, baseY + 5, 10, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 0;
  ctx.fillRect(cx - 6 + dance * 0.3, baseY + 9, 12, 3);

  // Body
  glow(ctx, C.body, 4, 10);
  ctx.beginPath();
  ctx.moveTo(cx + dance * 0.3, A.neckY - bounce);
  ctx.lineTo(cx + dance * 0.2, A.bodyBot.y - bounce * 0.5);
  ctx.stroke();

  // Heartbeat
  const beat = 1 + Math.sin(t * 12) * 0.3;
  ctx.save();
  ctx.translate(cx - 7 + dance * 0.3, 148 - bounce * 0.7);
  ctx.scale(beat, beat);
  fill(ctx, C.heart, 12);
  ctx.font = "15px serif";
  ctx.fillText("♥", 0, 0);
  ctx.restore();

  // Arms doing various dance moves
  const phase = Math.floor(t * 0.8) % 3;
  const armT = (t * 0.8) % 1;
  glow(ctx, C.arm, 3.5, 8);

  if (phase === 0) {
    // V pose
    const wav = Math.sin(t * 8) * 10;
    ctx.beginPath();
    ctx.moveTo(cx + dance * 0.3, A.shoulderY - bounce);
    ctx.quadraticCurveTo(
      cx - 30,
      A.shoulderY - 35 - bounce,
      cx - 38 - wav,
      baseY - 45,
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + dance * 0.3, A.shoulderY - bounce);
    ctx.quadraticCurveTo(
      cx + 30,
      A.shoulderY - 35 - bounce,
      cx + 38 + wav,
      baseY - 45,
    );
    ctx.stroke();
    fill(ctx, C.hand, 5);
    ctx.beginPath();
    ctx.arc(cx - 38 - wav, baseY - 47, 5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 38 + wav, baseY - 47, 5, 0, TAU);
    ctx.fill();
  } else if (phase === 1) {
    // Disco point
    const pt = Math.sin(t * 6) * 20;
    ctx.beginPath();
    ctx.moveTo(cx + dance * 0.3, A.shoulderY - bounce);
    ctx.lineTo(cx + 45 + pt, baseY - 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + dance * 0.3, A.shoulderY - bounce);
    ctx.lineTo(cx - 20, A.shoulderY + 20 - bounce);
    ctx.stroke();
    fill(ctx, C.hand, 5);
    ctx.beginPath();
    ctx.arc(cx + 45 + pt, baseY - 32, 5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - 22, A.shoulderY + 22 - bounce, 5, 0, TAU);
    ctx.fill();
  } else {
    // Robot wave
    const a1 = Math.sin(t * 10) * 15;
    const a2 = Math.cos(t * 10) * 15;
    ctx.beginPath();
    ctx.moveTo(cx + dance * 0.3, A.shoulderY - bounce);
    ctx.lineTo(cx - 30, A.shoulderY - 10 - bounce + a1);
    ctx.lineTo(cx - 35, A.shoulderY - 40 - bounce + a1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + dance * 0.3, A.shoulderY - bounce);
    ctx.lineTo(cx + 30, A.shoulderY - 10 - bounce + a2);
    ctx.lineTo(cx + 35, A.shoulderY - 40 - bounce + a2);
    ctx.stroke();
    fill(ctx, C.hand, 5);
    ctx.beginPath();
    ctx.arc(cx - 35, A.shoulderY - 42 - bounce + a1, 5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 35, A.shoulderY - 42 - bounce + a2, 5, 0, TAU);
    ctx.fill();
  }

  // Dancing legs
  const legSwing = Math.sin(t * 7) * 14;
  glow(ctx, C.leg, 3.5, 8);
  ctx.beginPath();
  ctx.moveTo(cx + dance * 0.2, A.hipY - bounce * 0.5);
  ctx.quadraticCurveTo(
    cx - 22,
    A.hipY + 30 - bounce * 0.3,
    A.lLeg.x + legSwing,
    A.lLeg.y - bounce * 0.2,
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + dance * 0.2, A.hipY - bounce * 0.5);
  ctx.quadraticCurveTo(
    cx + 22,
    A.hipY + 30 - bounce * 0.3,
    A.rLeg.x - legSwing,
    A.rLeg.y - bounce * 0.2,
  );
  ctx.stroke();

  drawShoe(
    ctx,
    A.lLeg.x + legSwing - 5,
    A.lLeg.y + 3 - bounce * 0.2,
    -0.25,
    t,
    0,
  );
  drawShoe(
    ctx,
    A.rLeg.x - legSwing + 5,
    A.rLeg.y + 3 - bounce * 0.2,
    0.25,
    t,
    0,
  );

  // Trophy + crown floating
  ctx.textAlign = "center";
  ctx.font = `${20 + Math.sin(t * 3) * 3}px serif`;
  ctx.fillStyle = "#eab308";
  ctx.shadowColor = "#eab308";
  ctx.shadowBlur = 14;
  ctx.fillText("🏆", cx + dance * 0.3, baseY - 38);
  ctx.font = "14px serif";
  ctx.fillText("👑", cx + dance * 0.3, baseY - 55 + Math.sin(t * 2) * 3);

  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  TOMBSTONE — with flowers, cracks
// ══════════════════════════════════════════════════════════════
function drawTombstone(ctx, t) {
  ctx.save();
  // Shadow
  ctx.fillStyle = "rgba(30,41,59,0.2)";
  ctx.beginPath();
  ctx.ellipse(BASE_X, 314, 30, 5, 0, 0, TAU);
  ctx.fill();

  // Stone
  const grad = ctx.createLinearGradient(183, 272, 237, 315);
  grad.addColorStop(0, "#4b5563");
  grad.addColorStop(1, "#374151");
  ctx.fillStyle = grad;
  ctx.shadowColor = "#1e293b";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(183, 272, 54, 42, [15, 15, 3, 3]);
  ctx.fill();

  // Cracks
  ctx.strokeStyle = "#6b7280";
  ctx.lineWidth = 0.8;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(200, 280);
  ctx.lineTo(195, 295);
  ctx.lineTo(198, 305);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(225, 285);
  ctx.lineTo(228, 300);
  ctx.stroke();

  // Cross
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(BASE_X, 279);
  ctx.lineTo(BASE_X, 295);
  ctx.moveTo(BASE_X - 7, 286);
  ctx.lineTo(BASE_X + 7, 286);
  ctx.stroke();

  // Text
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.shadowBlur = 0;
  ctx.fillText("R.I.P", BASE_X, 308);

  // Skull wobble
  const w = Math.sin(t * 3) * 4;
  ctx.font = "16px serif";
  ctx.fillText("💀", BASE_X + w, 265);

  // Little flowers
  ctx.font = "8px serif";
  ctx.fillText("🌸", 182, 312);
  ctx.fillText("🌷", 238, 310);

  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  WIN SEQUENCE HELPERS
// ══════════════════════════════════════════════════════════════

function easeOutCubic(t) {
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 3);
}

// ── Spinning throwing knife ──────────────────────────────────
function drawKnifeShape(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Motion trail glow
  ctx.save();
  for (let i = 1; i <= 5; i++) {
    ctx.globalAlpha = 0.15 - i * 0.025;
    ctx.translate(-9, 0);
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11 - i * 1.5, 2.5, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // Blade
  const bg = ctx.createLinearGradient(-4, -4, 20, 0);
  bg.addColorStop(0, "#94a3b8");
  bg.addColorStop(0.5, "#f1f5f9");
  bg.addColorStop(1, "#cbd5e1");
  ctx.fillStyle = bg;
  ctx.shadowColor = "#7dd3fc";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-4, -4.5);
  ctx.lineTo(-4, 4.5);
  ctx.closePath();
  ctx.fill();

  // Blade gleam
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(18, -0.5);
  ctx.lineTo(-2, -3.5);
  ctx.lineTo(1, -1);
  ctx.closePath();
  ctx.fill();

  // Guard
  ctx.fillStyle = "#b45309";
  ctx.shadowColor = "#92400e";
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.roundRect(-7, -6, 5, 12, 2);
  ctx.fill();
  ctx.fillStyle = "rgba(251,191,36,0.55)";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.roundRect(-6, -5, 2, 5, 1);
  ctx.fill();

  // Handle
  const hg = ctx.createLinearGradient(-24, -4, -4, 4);
  hg.addColorStop(0, "#1c0a00");
  hg.addColorStop(0.45, "#7c3f0a");
  hg.addColorStop(1, "#1c0a00");
  ctx.fillStyle = hg;
  ctx.shadowColor = "#000";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.roundRect(-24, -4.5, 18, 9, 3);
  ctx.fill();

  // Grip wraps
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-21 + i * 4, -4.5);
    ctx.lineTo(-21 + i * 4, 4.5);
    ctx.stroke();
  }

  // Pommel
  ctx.fillStyle = "#b45309";
  ctx.shadowColor = "#92400e";
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(-23, 0, 3.5, 0, TAU);
  ctx.fill();

  // Rivet
  ctx.fillStyle = "#fbbf24";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(-14, 0, 1.5, 0, TAU);
  ctx.fill();

  ctx.restore();
}

// ── Rope-cut sparks + upper stub ────────────────────────────
function drawCutRopeEffect(ctx, cutX, cutY, elapsed) {
  if (elapsed < 0) return;
  ctx.save();

  // Upper rope stub still attached to gallows (jitters then settles)
  const jitter = Math.max(0, 1 - elapsed / 0.35);
  const jx = Math.sin(elapsed * 80) * jitter * 2.5;
  glow(ctx, C.rope, 2.5, 6);
  ctx.beginPath();
  ctx.moveTo(A.ropeTop.x, A.ropeTop.y);
  ctx.lineTo(cutX + jx, cutY + 4);
  ctx.stroke();

  // Tiny knot stub
  ctx.beginPath();
  ctx.arc(cutX + jx, cutY + 4, 4, 0, TAU);
  ctx.stroke();

  // Sparks explosion at cut point
  const sparkDur = 0.55;
  if (elapsed < sparkDur) {
    const sp = elapsed / sparkDur;

    // Flash burst
    ctx.save();
    ctx.globalAlpha = Math.max(0, (1 - sp * 2.5) * 0.9);
    ctx.fillStyle = "#fde047";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(cutX, cutY, 7 + sp * 5, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Flying spark particles
    const cols = ["#fbbf24", "#f97316", "#fde047", "#ef4444", "#fff"];
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * TAU + elapsed * 3;
      const dist = sp * 30 + (i % 3) * 5;
      ctx.globalAlpha = Math.max(0, 1 - sp * 1.6);
      ctx.fillStyle = cols[i % cols.length];
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(
        cutX + Math.cos(angle) * dist,
        cutY + Math.sin(angle) * dist * 0.55,
        1.2 + (i % 3) * 0.6,
        0,
        TAU,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ── Win speech bubble ────────────────────────────────────────
function drawWinSpeechBubble(ctx, cx, cy, text) {
  ctx.save();
  ctx.font = "bold 10.5px system-ui, sans-serif";
  const tw = ctx.measureText(text).width;
  const pw = tw + 20;
  const ph = 26;
  const bx = cx + 36;
  const by = cy - 46;
  const wobble = Math.sin(performance.now() / 280) * 1.5;

  fill(ctx, C.bubble, 4);
  [
    [cx + 17, cy - 17, 3],
    [cx + 23, cy - 26, 4],
    [cx + 29, cy - 34, 5],
  ].forEach(([dx, dy, dr]) => {
    ctx.beginPath();
    ctx.arc(dx, dy, dr, 0, TAU);
    ctx.fill();
  });

  ctx.shadowColor = "rgba(253,224,71,0.45)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#fefce8";
  ctx.beginPath();
  ctx.roundRect(bx - pw / 2, by - ph / 2 + wobble, pw, ph, 12);
  ctx.fill();

  ctx.strokeStyle = "#fde047";
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.roundRect(bx - pw / 2, by - ph / 2 + wobble, pw, ph, 12);
  ctx.stroke();

  ctx.fillStyle = "#1e293b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, bx, by + wobble);
  ctx.restore();
}

// ── Right-arm catch & self-cut animation ────────────────────
function drawWinCatchCut(ctx, t, bodyInfo, elapsedTotal, timings) {
  const {neckY} = bodyInfo;
  const shoulderY = neckY + 23;
  const sx = A.headCtr.x; // no swing offset during win pre-cut

  const {KNIFE_CATCH, ARM_AT_ROPE, ROPE_CUT} = timings;

  // Compute arm endpoint — smoothly animated per phase
  let endX, endY;
  if (elapsedTotal < KNIFE_CATCH) {
    // Arm twitches with anticipation while knife is incoming
    const twitch = Math.sin(elapsedTotal * 14) * 1.8;
    endX = A.rArm.x + twitch;
    endY = A.rArm.y + twitch * 0.4;
  } else if (elapsedTotal < ARM_AT_ROPE) {
    // Arm raises smoothly from catch pos to the rope
    const p = easeOutCubic(
      Math.min(1, (elapsedTotal - KNIFE_CATCH) / (ARM_AT_ROPE - KNIFE_CATCH)),
    );
    endX = lerp(A.rArm.x, A.ropeTop.x + 6, p);
    endY = lerp(A.rArm.y, A.ropeTop.y + 16, p);
  } else {
    // Arm at rope — small vibration during cutting
    const vib =
      elapsedTotal < ROPE_CUT + 0.25 ? Math.sin(elapsedTotal * 85) * 1.8 : 0;
    endX = A.ropeTop.x + 6 + vib;
    endY = A.ropeTop.y + 16;
  }

  // Draw the animated right arm
  ctx.save();
  glow(ctx, C.arm, 3.5, 8);
  ctx.beginPath();
  ctx.moveTo(sx, shoulderY);
  ctx.quadraticCurveTo(sx + 16, shoulderY + 18, endX, endY);
  ctx.stroke();
  drawHand(ctx, endX + 3, endY + 2, t, 0, 1);
  ctx.restore();

  // Knife in hand — angle transitions from caught → pointing at rope
  if (elapsedTotal >= KNIFE_CATCH) {
    const p2 = easeOutCubic(
      Math.min(1, (elapsedTotal - KNIFE_CATCH) / (ARM_AT_ROPE - KNIFE_CATCH)),
    );
    const kAngle = lerp(Math.PI * 0.55, -Math.PI * 0.72, p2);
    const vib2 =
      elapsedTotal >= ARM_AT_ROPE && elapsedTotal < ROPE_CUT + 0.25
        ? Math.sin(elapsedTotal * 85) * 0.07
        : 0;
    drawKnifeShape(ctx, endX, endY - 3, kAngle + vib2);
  }
}

// ── Knife falling after rope cut ────────────────────────────
function drawFallingKnife(ctx, elapsed, startX, startY) {
  if (elapsed < 0 || elapsed > 2.8) return;
  const ky = startY + 50 * elapsed + 0.5 * 420 * elapsed * elapsed;
  if (ky > H + 40) return;
  const kx = startX + Math.sin(elapsed * 4) * 5;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - elapsed * 0.7);
  drawKnifeShape(ctx, kx, ky, elapsed * 9);
  ctx.restore();
}

// ── Falling man (rope snapped — same proportions as hanging) ─
function drawWinFall(ctx, t, fallElapsed, wrongGuesses) {
  const FALL_DUR = 1.2;
  const fp = Math.min(1, fallElapsed / FALL_DUR);

  // ── Derive proportions from the actual hanging-man formulas ──
  const wg = Math.max(1, wrongGuesses);
  const ropeEnd = 94 + wg * 1.2;
  const hangHY = ropeEnd + A.headR + 3; // head centre  ≈107
  const hangNY = ropeEnd + A.headR * 2 + 4; // neck         ≈132
  const hangIPY = hangNY + 83; // hip          ≈215
  const hangCOM = (hangHY + hangIPY) / 2; // centre mass  ≈161
  const legExt = A.lLeg.y - hangIPY; // leg segment  ≈50

  // Offsets relative to centre of mass (consistent across all phases)
  const HY = hangHY - hangCOM; // head   ≈ -54
  const NY = hangNY - hangCOM; // neck   ≈ -29
  const IY = hangIPY - hangCOM; // hip    ≈  54
  const SY = NY + 23; // shoulder ≈ -6
  const AY = A.lArm.y - hangCOM; // arm ends ≈ +24
  const LAX = A.lArm.x - BASE_X; // ≈ -42
  const RAX = A.rArm.x - BASE_X; // ≈ +42
  const LLX = A.lLeg.x - BASE_X; // ≈ -40
  const RLX = A.rLeg.x - BASE_X; // ≈ +40

  // Land so feet sit at y ≈ 318
  const LAND_COM = 318 - IY - legExt; // ≈ 214

  // Centre-of-mass during fall (gravity ease-in) + landing bounce
  let comY;
  if (fp < 1) {
    comY = lerp(hangCOM, LAND_COM, fp * fp * fp);
  } else {
    const lt = fallElapsed - FALL_DUR;
    const bounce = 14 * Math.exp(-lt * 5.5) * Math.abs(Math.sin(lt * 14));
    comY = LAND_COM - bounce;
  }

  // One clean spin during fall; upright on landing
  const rotation = fp < 1 ? TAU * fp : 0;

  ctx.save();
  ctx.translate(BASE_X, comY);
  ctx.rotate(rotation);

  // ── Head ──
  glow(ctx, C.head, 4, 12);
  ctx.beginPath();
  ctx.arc(0, HY, A.headR, 0, TAU);
  ctx.stroke();

  // Happy face — same as when hanging, eyes open ✨
  fill(ctx, C.head, 4);
  ctx.beginPath();
  ctx.arc(-7, HY - 4, 3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(7, HY - 4, 3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#1e293b";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(-7, HY - 4, 1.4, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(7, HY - 4, 1.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.arc(-8, HY - 5, 1, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(6, HY - 5, 1, 0, TAU);
  ctx.fill();
  glow(ctx, C.head, 2.5, 6);
  ctx.beginPath();
  ctx.arc(0, HY + 5, 9, 0.12, Math.PI - 0.12);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 0;
  ctx.fillRect(-5, HY + 8, 10, 3);

  // ── Body ──
  glow(ctx, C.body, 4, 10);
  ctx.beginPath();
  ctx.moveTo(0, NY);
  ctx.lineTo(0, IY);
  ctx.stroke();
  const beat = 1 + Math.sin(t * 14) * 0.35;
  ctx.save();
  ctx.translate(-7, NY + 20);
  ctx.scale(beat, beat);
  fill(ctx, C.heart, 10);
  ctx.font = "13px serif";
  ctx.fillText("♥", 0, 0);
  ctx.restore();

  // ── Arms — flail while falling, V-pose once landed ──
  glow(ctx, C.arm, 3.5, 8);
  if (fp < 1) {
    const fl = Math.sin(fallElapsed * 14) * 18;
    const fr = Math.cos(fallElapsed * 14) * 18;
    ctx.beginPath();
    ctx.moveTo(0, SY);
    ctx.quadraticCurveTo(-20, SY + 8, LAX + fl * 0.4, HY + fl * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, SY);
    ctx.quadraticCurveTo(20, SY + 8, RAX + fr * 0.4, HY + fr * 0.3);
    ctx.stroke();
    fill(ctx, C.hand, 5);
    ctx.beginPath();
    ctx.arc(LAX + fl * 0.4, HY + fl * 0.3, 5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(RAX + fr * 0.4, HY + fr * 0.3, 5, 0, TAU);
    ctx.fill();
  } else {
    const lt = Math.min(1, (fallElapsed - FALL_DUR) / 0.45);
    const armLx = lerp(LAX, -28, easeOutCubic(lt));
    const armRx = lerp(RAX, 28, easeOutCubic(lt));
    const armY = lerp(AY, HY - 22, easeOutCubic(lt));
    ctx.beginPath();
    ctx.moveTo(0, SY);
    ctx.quadraticCurveTo(-20, SY + 5, armLx, armY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, SY);
    ctx.quadraticCurveTo(20, SY + 5, armRx, armY);
    ctx.stroke();
    fill(ctx, C.hand, 5);
    ctx.beginPath();
    ctx.arc(armLx, armY, 5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(armRx, armY, 5, 0, TAU);
    ctx.fill();
  }

  // ── Legs — kick while falling, stand/squat once landed ──
  glow(ctx, C.leg, 3.5, 8);
  if (fp < 1) {
    const kl = Math.sin(fallElapsed * 16) * 22;
    const kr = Math.cos(fallElapsed * 16) * 22;
    ctx.beginPath();
    ctx.moveTo(0, IY);
    ctx.quadraticCurveTo(-14, IY + legExt * 0.55, LLX + kl * 0.4, IY + legExt);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, IY);
    ctx.quadraticCurveTo(14, IY + legExt * 0.55, RLX + kr * 0.4, IY + legExt);
    ctx.stroke();
    drawShoe(ctx, LLX + kl * 0.3, IY + legExt + 3, -0.25, t, 0);
    drawShoe(ctx, RLX + kr * 0.3, IY + legExt + 3, 0.25, t, 0);
  } else {
    const lt = fallElapsed - FALL_DUR;
    const stand = Math.max(0, Math.min(1, (lt - 0.1) / 0.32));
    const spread = lerp(Math.abs(LLX), 13, easeOutCubic(stand));
    ctx.beginPath();
    ctx.moveTo(0, IY);
    ctx.quadraticCurveTo(-12, IY + legExt * 0.55, -spread, IY + legExt);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, IY);
    ctx.quadraticCurveTo(12, IY + legExt * 0.55, spread, IY + legExt);
    ctx.stroke();
    drawShoe(ctx, -spread - 4, IY + legExt + 3, -0.25, t, 0);
    drawShoe(ctx, spread + 4, IY + legExt + 3, 0.25, t, 0);
  }

  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  WAITING IDLE (0 wrong guesses) — man waiting on platform
// ══════════════════════════════════════════════════════════════
function drawIdleWaiting(ctx, t) {
  ctx.save();
  // Little stick man sitting on the base platform, bored
  const sx = 75;
  const sy = 304;
  const bob = Math.sin(t * 1.5) * 1;

  // Body
  glow(ctx, C.body, 3, 6);
  ctx.beginPath();
  ctx.moveTo(sx, sy - 16 + bob);
  ctx.lineTo(sx, sy - 40 + bob);
  ctx.stroke();

  // Head
  glow(ctx, C.head, 3, 8);
  ctx.beginPath();
  ctx.arc(sx, sy - 52 + bob, 12, 0, TAU);
  ctx.stroke();

  // Happy face
  fill(ctx, C.head, 3);
  ctx.beginPath();
  ctx.arc(sx - 4, sy - 55 + bob, 2, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx + 4, sy - 55 + bob, 2, 0, TAU);
  ctx.fill();
  glow(ctx, C.head, 1.5, 3);
  ctx.beginPath();
  ctx.arc(sx, sy - 49 + bob, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Legs (dangling off platform)
  glow(ctx, C.leg, 2.5, 5);
  const legSwing1 = Math.sin(t * 2) * 6;
  const legSwing2 = Math.sin(t * 2 + 1.5) * 6;
  ctx.beginPath();
  ctx.moveTo(sx, sy - 16 + bob);
  ctx.lineTo(sx - 8, sy + legSwing1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx, sy - 16 + bob);
  ctx.lineTo(sx + 8, sy + legSwing2);
  ctx.stroke();

  // Arms (one waving)
  glow(ctx, C.arm, 2.5, 5);
  const armWave = Math.sin(t * 3) * 12;
  ctx.beginPath();
  ctx.moveTo(sx, sy - 32 + bob);
  ctx.lineTo(sx + 18, sy - 42 + bob + armWave);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx, sy - 32 + bob);
  ctx.lineTo(sx - 14, sy - 22 + bob);
  ctx.stroke();

  // Speech: casual waiting phrases
  const waitLines = [
    "Waiting... ⏳",
    "Type something!",
    "I'm bored 🥱",
    "Hello? 👋",
    "Give it a try!",
  ];
  const wIdx = Math.floor((t * 0.25) % waitLines.length);
  ctx.font = "bold 9px system-ui, sans-serif";
  fill(ctx, C.bubble, 6);
  ctx.shadowColor = "rgba(253,224,71,0.3)";
  const wt = waitLines[wIdx];
  const wtw = ctx.measureText(wt).width + 14;
  ctx.beginPath();
  ctx.roundRect(sx + 16, sy - 70, wtw, 20, 8);
  ctx.fill();
  ctx.fillStyle = "#1e293b";
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
  ctx.fillText(wt, sx + 23, sy - 57);

  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  NEW WIN ANIMATION — Rope snap → Jump → Trophy → Celebrate
// ══════════════════════════════════════════════════════════════

// ── Golden trophy shape ──────────────────────────────────────
function drawTrophyGolden(ctx, x, y, t) {
  ctx.save();
  const glow$ = 0.7 + Math.sin(t * 3) * 0.3;

  // Aura
  const aura = ctx.createRadialGradient(x, y - 2, 3, x, y - 2, 26);
  aura.addColorStop(0, `rgba(251,191,36,${glow$ * 0.3})`);
  aura.addColorStop(1, "rgba(251,191,36,0)");
  ctx.fillStyle = aura;
  ctx.fillRect(x - 32, y - 28, 64, 52);

  ctx.shadowColor = "#fbbf24";
  ctx.shadowBlur = 14 * glow$;

  // Cup body
  const cupGrad = ctx.createLinearGradient(x - 13, y - 16, x + 13, y + 4);
  cupGrad.addColorStop(0, "#fde68a");
  cupGrad.addColorStop(0.35, "#fbbf24");
  cupGrad.addColorStop(0.7, "#f59e0b");
  cupGrad.addColorStop(1, "#d97706");
  ctx.fillStyle = cupGrad;
  ctx.beginPath();
  ctx.moveTo(x - 13, y - 16);
  ctx.lineTo(x + 13, y - 16);
  ctx.lineTo(x + 9, y);
  ctx.quadraticCurveTo(x, y + 4, x - 9, y);
  ctx.closePath();
  ctx.fill();

  // Rim highlight
  ctx.strokeStyle = "#fef3c7";
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 15);
  ctx.lineTo(x + 12, y - 15);
  ctx.stroke();

  // Handles
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "#f59e0b";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(x - 14, y - 8, 5.5, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 14, y - 8, 5.5, Math.PI * 0.5, -Math.PI * 0.5);
  ctx.stroke();

  // Stem
  ctx.fillStyle = "#f59e0b";
  ctx.shadowBlur = 4;
  ctx.fillRect(x - 2, y + 2, 4, 8);

  // Base
  ctx.fillStyle = "#d97706";
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 9, 3, 0, 0, TAU);
  ctx.fill();

  // Star emblem
  ctx.fillStyle = "#fef3c7";
  ctx.shadowColor = "#fde047";
  ctx.shadowBlur = 8;
  drawMiniStar(ctx, x, y - 7, 4);

  // Gleam
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.ellipse(x - 5, y - 12, 1.5, 6, 0.25, 0, TAU);
  ctx.fill();

  // Orbiting sparkles
  for (let i = 0; i < 4; i++) {
    const angle = (t * 2 + (i * Math.PI) / 2) % TAU;
    const dist = 20 + Math.sin(t * 3 + i) * 3;
    const sx = x + Math.cos(angle) * dist;
    const sy = y - 3 + Math.sin(angle) * dist * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(t * 5 + i * 2) * 0.3;
    ctx.fillStyle = "#fde047";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 5;
    drawMiniStar(ctx, sx, sy, 2.5);
    ctx.restore();
  }

  ctx.restore();
}

// ── Rope glow before snap ────────────────────────────────────
function drawRopeGlow(ctx, ropeX, topY, botY, progress, t) {
  if (progress <= 0) return;
  ctx.save();
  const intensity = Math.min(1, progress);
  const shimmer = 0.7 + Math.sin(t * 18) * 0.3;

  // Radial glow
  const midY = (topY + botY) / 2;
  const grad = ctx.createRadialGradient(
    ropeX,
    midY,
    2,
    ropeX,
    midY,
    18 + intensity * 18,
  );
  grad.addColorStop(0, `rgba(251,191,36,${intensity * shimmer * 0.5})`);
  grad.addColorStop(1, "rgba(251,191,36,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(ropeX - 40, topY - 5, 80, botY - topY + 10);

  // Vibrating golden overlay
  if (intensity > 0.25) {
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 2;
    ctx.globalAlpha = intensity * 0.5;
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(ropeX, topY);
    for (let yy = topY; yy <= botY; yy += 2) {
      ctx.lineTo(ropeX + Math.sin(t * 35 + yy * 0.6) * intensity * 3.5, yy);
    }
    ctx.stroke();
  }

  // Rising particles
  const np = Math.floor(intensity * 12);
  for (let i = 0; i < np; i++) {
    const ropeLen = botY - topY;
    const py = botY - ((t * 45 + i * (ropeLen / np)) % (ropeLen + 20));
    if (py < topY - 10 || py > botY + 5) continue;
    const px = ropeX + Math.sin(t * 4.5 + i * 1.4) * (3 + intensity * 6);
    const aDist = Math.abs(py - midY) / (ropeLen / 2);
    ctx.globalAlpha = Math.max(0, (1 - aDist) * intensity * 0.7);
    ctx.fillStyle = i % 2 === 0 ? "#fde047" : "#fbbf24";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(px, py, 1.2 + Math.sin(t * 6 + i) * 0.4, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

// ── Rope snap particle explosion ─────────────────────────────
function drawRopeSnapParticles(ctx, snapX, snapY, elapsed) {
  if (elapsed < 0) return;
  ctx.save();

  // Upper rope stub with jitter
  const jitter = Math.max(0, 1 - elapsed / 0.4) * 3;
  const jx = Math.sin(elapsed * 65) * jitter;
  glow(ctx, C.rope, 2.5, 6);
  ctx.beginPath();
  ctx.moveTo(A.ropeTop.x, A.ropeTop.y);
  ctx.lineTo(snapX + jx, snapY + 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(snapX + jx, snapY + 5, 3.5, 0, TAU);
  ctx.stroke();

  // Flash burst
  if (elapsed < 0.35) {
    const fp = elapsed / 0.35;
    ctx.globalAlpha = Math.max(0, (1 - fp * 2.5) * 0.7);
    ctx.fillStyle = "#fde047";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(snapX, snapY, 8 + fp * 18, 0, TAU);
    ctx.fill();
  }

  // Flying sparks
  if (elapsed < 0.65) {
    const sp = elapsed / 0.65;
    const cols = [
      "#fbbf24",
      "#f97316",
      "#fde047",
      "#ef4444",
      "#fff",
      "#fef3c7",
    ];
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * TAU + elapsed * 5;
      const dist = sp * 38 + (i % 4) * 5;
      ctx.globalAlpha = Math.max(0, 1 - sp * 1.6);
      ctx.fillStyle = cols[i % cols.length];
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(
        snapX + Math.cos(angle) * dist,
        snapY + Math.sin(angle) * dist * 0.55,
        1.2 + (i % 3) * 0.5,
        0,
        TAU,
      );
      ctx.fill();
    }
  }

  // Rope fiber fragments
  if (elapsed < 0.5) {
    const rp = elapsed / 0.5;
    ctx.strokeStyle = C.rope;
    ctx.lineWidth = 1;
    ctx.globalAlpha = Math.max(0, 1 - rp * 1.5);
    ctx.shadowBlur = 0;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * TAU;
      const dx = Math.cos(angle) * rp * 18;
      const dy = Math.sin(angle) * rp * 12 - rp * 5;
      ctx.beginPath();
      ctx.moveTo(snapX + dx - 2, snapY + dy);
      ctx.lineTo(snapX + dx + 2, snapY + dy + 1.5);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ── Impact dust ring on landing ──────────────────────────────
function drawImpactDust(ctx, cx, groundY, elapsed) {
  if (elapsed < 0 || elapsed > 0.8) return;
  ctx.save();
  const ep = elapsed / 0.8;

  // Expanding ring
  ctx.globalAlpha = Math.max(0, (1 - ep * 1.2) * 0.5);
  ctx.strokeStyle = "rgba(148,163,184,0.6)";
  ctx.lineWidth = Math.max(0.5, 2.5 - ep * 2);
  ctx.shadowColor = "rgba(148,163,184,0.2)";
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.ellipse(cx, groundY, ep * 45, ep * 7, 0, 0, TAU);
  ctx.stroke();

  // Secondary ring
  if (ep > 0.1) {
    const ep2 = (ep - 0.1) / 0.9;
    ctx.globalAlpha = Math.max(0, (1 - ep2 * 1.4) * 0.3);
    ctx.beginPath();
    ctx.ellipse(cx, groundY, ep2 * 35, ep2 * 5, 0, 0, TAU);
    ctx.stroke();
  }

  // Dust puffs
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI + Math.PI;
    const dist = ep * (28 + (i % 3) * 8);
    const px = cx + Math.cos(angle + Math.PI) * dist;
    const py = groundY - Math.abs(Math.sin(angle)) * dist * 0.4 - ep * 6;
    ctx.globalAlpha = Math.max(0, 0.4 - ep * 0.5);
    ctx.fillStyle = "rgba(148,163,184,0.4)";
    ctx.shadowBlur = 2;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(0.5, 2.5 - ep * 2), 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

// ── Trophy descending from above ─────────────────────────────
function drawTrophyDescending(ctx, cx, targetY, elapsed, t) {
  const DESCENT_DUR = 0.55;
  const dp = Math.min(1, elapsed / DESCENT_DUR);
  const ep = easeOutCubic(dp);

  const startY = -40;
  const currentY = lerp(startY, targetY, ep);

  ctx.save();

  // Golden trail
  if (dp < 1) {
    for (let i = 0; i < 6; i++) {
      const trailY = currentY - (i + 1) * 10;
      if (trailY < startY) continue;
      ctx.globalAlpha = (0.35 - i * 0.06) * (1 - dp * 0.5);
      ctx.fillStyle = "#fbbf24";
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx + Math.sin(t * 5 + i) * 2, trailY, 2.5 - i * 0.3, 0, TAU);
      ctx.fill();
    }
  }

  // Arrival sparkle burst
  if (dp >= 0.9 && elapsed < DESCENT_DUR + 0.5) {
    const bp = (elapsed - DESCENT_DUR * 0.9) / 0.5;
    ctx.globalAlpha = Math.max(0, (1 - bp * 2) * 0.6);
    ctx.fillStyle = "#fde047";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(cx, targetY - 4, bp * 22, 0, TAU);
    ctx.fill();
  }

  ctx.globalAlpha = dp > 0.05 ? 1 : dp / 0.05;
  drawTrophyGolden(ctx, cx, currentY, t);

  ctx.restore();
}

// ── Victory celebration dance with trophy ────────────────────
function drawVictoryCelebration(ctx, t) {
  ctx.save();
  const cx = BASE_X;
  const groundY = 318;
  const dance = Math.sin(t * 5) * 8;
  const bounce = Math.abs(Math.sin(t * 4)) * 10;

  // Stage glow
  const stageGrad = ctx.createRadialGradient(cx, groundY, 5, cx, groundY, 60);
  stageGrad.addColorStop(0, "rgba(251,191,36,0.2)");
  stageGrad.addColorStop(1, "rgba(251,191,36,0)");
  ctx.fillStyle = stageGrad;
  ctx.fillRect(cx - 70, groundY - 8, 140, 20);

  // Disco floor
  ctx.save();
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 6; i++) {
    const x = 140 + i * 22;
    const hue = (t * 60 + i * 40) % 360;
    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
    ctx.fillRect(x, 310, 18, 12);
  }
  ctx.restore();

  // Sparkle trail
  for (let i = 0; i < 5; i++) {
    const delay = i * 0.12;
    const trailT = t - delay;
    const tx = cx + Math.sin(trailT * 5) * 8 * 0.3;
    const ty = 160 - Math.abs(Math.sin(trailT * 4)) * 10;
    ctx.save();
    ctx.globalAlpha = 0.3 - i * 0.06;
    ctx.fillStyle = C.conf[i % C.conf.length];
    ctx.shadowColor = C.conf[i % C.conf.length];
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(tx, ty, 2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  const bx = cx + dance * 0.3;
  const yOff = -bounce;

  // Character positions
  const feetY = groundY + yOff;
  const hipY = feetY - 55;
  const neckY = hipY - 50;
  const headY = neckY - A.headR - 2;
  const shoulderY = neckY + 18;

  // Ground shadow
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.ellipse(bx, groundY + 2, 22 + Math.abs(dance) * 0.3, 3.5, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // ── Legs ──
  const legSwing = Math.sin(t * 7) * 12;
  glow(ctx, C.leg, 3.5, 8);
  ctx.beginPath();
  ctx.moveTo(bx, hipY);
  ctx.quadraticCurveTo(bx - 14, hipY + 28, bx - 14 + legSwing, feetY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx, hipY);
  ctx.quadraticCurveTo(bx + 14, hipY + 28, bx + 14 - legSwing, feetY);
  ctx.stroke();
  drawShoe(ctx, bx - 14 + legSwing - 5, feetY + 3, -0.25, t, 0);
  drawShoe(ctx, bx + 14 - legSwing + 5, feetY + 3, 0.25, t, 0);

  // ── Body ──
  glow(ctx, C.body, 4, 10);
  ctx.beginPath();
  ctx.moveTo(bx, neckY);
  ctx.lineTo(bx, hipY);
  ctx.stroke();

  // Heart
  const beat = 1 + Math.sin(t * 12) * 0.25;
  ctx.save();
  ctx.translate(bx - 7, neckY + 16);
  ctx.scale(beat, beat);
  fill(ctx, C.heart, 10);
  ctx.font = "14px serif";
  ctx.fillText("\u2665", 0, 0);
  ctx.restore();

  // Belt
  ctx.save();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(bx - 8, hipY - 2);
  ctx.lineTo(bx + 8, hipY - 2);
  ctx.stroke();
  ctx.restore();

  // ── Arms holding trophy ──
  const armPhase = Math.floor(t * 0.8) % 3;
  glow(ctx, C.arm, 3.5, 8);
  const armWave = Math.sin(t * 8) * 6;

  let leftHandX, leftHandY, rightHandX, rightHandY;

  if (armPhase === 0) {
    leftHandX = bx - 12 + armWave;
    leftHandY = headY - 32;
    rightHandX = bx + 12 - armWave;
    rightHandY = headY - 32;
  } else if (armPhase === 1) {
    const tilt = Math.sin(t * 6) * 10;
    leftHandX = bx - 6 + tilt;
    leftHandY = headY - 28;
    rightHandX = bx + 18 + tilt;
    rightHandY = headY - 36;
  } else {
    const tilt = Math.sin(t * 6) * 10;
    leftHandX = bx - 18 - tilt;
    leftHandY = headY - 36;
    rightHandX = bx + 6 - tilt;
    rightHandY = headY - 28;
  }

  ctx.beginPath();
  ctx.moveTo(bx, shoulderY);
  ctx.quadraticCurveTo(bx - 25, shoulderY - 15, leftHandX, leftHandY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx, shoulderY);
  ctx.quadraticCurveTo(bx + 25, shoulderY - 15, rightHandX, rightHandY);
  ctx.stroke();

  fill(ctx, C.hand, 5);
  ctx.beginPath();
  ctx.arc(leftHandX, leftHandY, 5, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(rightHandX, rightHandY, 5, 0, TAU);
  ctx.fill();

  // ── Trophy between hands ──
  const trophyX = (leftHandX + rightHandX) / 2;
  const trophyY = Math.min(leftHandY, rightHandY) - 12;
  drawTrophyGolden(ctx, trophyX, trophyY, t);

  // ── Head ──
  glow(ctx, C.head, 4, 14);
  ctx.beginPath();
  ctx.arc(bx, headY, A.headR, 0, TAU);
  ctx.stroke();

  // Sunglasses
  ctx.save();
  ctx.fillStyle = "#1e293b";
  ctx.shadowBlur = 0;
  ctx.fillRect(bx - 15, headY - 8, 12, 8);
  ctx.fillRect(bx + 3, headY - 8, 12, 8);
  ctx.fillRect(bx - 3, headY - 6, 6, 3);
  ctx.fillStyle = "rgba(96,165,250,0.4)";
  ctx.fillRect(bx - 14, headY - 7, 5, 3);
  ctx.fillRect(bx + 4, headY - 7, 5, 3);
  ctx.restore();

  // Big smile
  glow(ctx, C.head, 3, 8);
  ctx.beginPath();
  ctx.arc(bx, headY + 5, 10, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 0;
  ctx.fillRect(bx - 6, headY + 9, 12, 3);

  // Crown above trophy
  ctx.font = "14px serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#eab308";
  ctx.shadowColor = "#eab308";
  ctx.shadowBlur = 10;
  ctx.fillText("\uD83D\uDC51", trophyX, trophyY - 25 + Math.sin(t * 2) * 3);

  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function HangmanCanvas({wrongGuesses, lost, won}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const confettiRef = useRef(null);
  const deathTimeRef = useRef(null);
  const wonAtRef = useRef(null);
  const startRef = useRef(null);
  const prevWrongRef = useRef(0);
  const blinkTimer = useRef(0);
  const blinkState = useRef(1);
  const emojisRef = useRef(createFloatingEmojis());

  const getMood = useCallback(() => {
    if (lost) return 5;
    if (wrongGuesses >= 5) return 4;
    if (wrongGuesses >= 4) return 3;
    if (wrongGuesses >= 3) return 2;
    if (wrongGuesses >= 1) return 1;
    return 0;
  }, [wrongGuesses, lost]);

  // Spawn emoji reaction when wrongGuesses changes
  useEffect(() => {
    if (wrongGuesses > prevWrongRef.current && wrongGuesses > 0) {
      const emoji = REACTION_EMOJIS[wrongGuesses] || "😵";
      spawnEmoji(emojisRef.current, emoji, A.headCtr.x, A.headCtr.y - 30);
      // Spawn extra emojis at higher moods
      if (wrongGuesses >= 4) {
        spawnEmoji(emojisRef.current, "💀", A.headCtr.x - 20, A.headCtr.y);
      }
      if (wrongGuesses >= 5) {
        spawnEmoji(emojisRef.current, "🫠", A.headCtr.x + 20, A.headCtr.y + 10);
      }
    }
    prevWrongRef.current = wrongGuesses;
  }, [wrongGuesses]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    startRef.current = startRef.current || performance.now();

    if (won && !confettiRef.current) confettiRef.current = createConfetti();
    if (!won) confettiRef.current = null;

    if (won && wonAtRef.current === null) {
      wonAtRef.current = (performance.now() - startRef.current) / 1000;
    }
    if (!won) wonAtRef.current = null;

    if (lost && !deathTimeRef.current) {
      deathTimeRef.current = (performance.now() - startRef.current) / 1000;
    }
    if (!lost) deathTimeRef.current = null;

    let running = true;

    function frame(now) {
      if (!running) return;
      const t = (now - startRef.current) / 1000;

      // Blink cycle
      blinkTimer.current += 1 / 60;
      if (blinkTimer.current > 2.5 + Math.random() * 2.5) {
        blinkTimer.current = 0;
        blinkState.current = 0;
      }
      if (blinkState.current < 1) blinkState.current += 0.1;

      ctx.clearRect(0, 0, W, H);
      const mood = getMood();

      // ── Gallows ──
      const creak = drawGallows(ctx, t, wrongGuesses);

      if (won) {
        // ══════════════════════════════════════════════════════
        //  WIN SEQUENCE:
        //  rope glows → snaps → man jumps/falls → lands →
        //  trophy descends → celebration dance with trophy
        // ══════════════════════════════════════════════════════
        const elapsed = wonAtRef.current !== null ? t - wonAtRef.current : 0;

        // ── Phase timings (seconds after win) ──────────────────
        const ROPE_SNAP = 0.6; // rope breaks
        const FALL_START = 0.7; // body begins free fall
        const LAND_TIME = FALL_START + 1.2; // lands on ground
        const TROPHY_START = 2.6; // trophy descends from sky
        const DANCE_START = 3.3; // full celebration starts

        if (elapsed >= DANCE_START) {
          // ── Full victory celebration with trophy ────────────
          drawVictoryCelebration(ctx, t);
          if (confettiRef.current) drawConfetti(ctx, confettiRef.current, t);
          if (Math.random() < 0.04) {
            const vEmojis = [
              "\uD83C\uDF89",
              "\u2B50",
              "\uD83D\uDD25",
              "\uD83D\uDC83",
              "\uD83D\uDD7A",
              "\u2728",
              "\uD83C\uDF8A",
              "\uD83C\uDFC6",
            ];
            spawnEmoji(
              emojisRef.current,
              vEmojis[Math.floor(Math.random() * vEmojis.length)],
              Math.random() * W,
              H,
            );
          }
        } else if (elapsed >= TROPHY_START) {
          // ── Standing man + trophy descending ────────────────
          drawWinFall(ctx, t, 5, wrongGuesses);
          drawTrophyDescending(ctx, BASE_X, 100, elapsed - TROPHY_START, t);
          if (confettiRef.current) drawConfetti(ctx, confettiRef.current, t);
        } else if (elapsed >= FALL_START) {
          // ── Free fall + landing ─────────────────────────────
          const fallElapsed = elapsed - FALL_START;
          drawWinFall(ctx, t, fallElapsed, wrongGuesses);
          drawRopeSnapParticles(
            ctx,
            A.ropeTop.x,
            A.ropeTop.y + 10,
            elapsed - ROPE_SNAP,
          );
          if (elapsed >= LAND_TIME) {
            drawImpactDust(ctx, BASE_X, 318, elapsed - LAND_TIME);
          }
          if (confettiRef.current && elapsed >= LAND_TIME) {
            drawConfetti(ctx, confettiRef.current, t);
          }
        } else {
          // ── Pre-snap: hanging man + rope glow ───────────────
          if (wrongGuesses >= 1) {
            const {swing, ropeEndY} = drawRope(ctx, t, wrongGuesses, creak, 0);

            const headInfo = drawHead(
              ctx,
              t,
              0,
              blinkState.current,
              swing,
              ropeEndY,
            );
            if (wrongGuesses >= 2) {
              const bodyI = drawBody(ctx, t, headInfo.bob, swing, ropeEndY, 0);
              if (wrongGuesses >= 3) drawLeftArm(ctx, t, bodyI, swing, 0);
              if (wrongGuesses >= 4) drawRightArm(ctx, t, bodyI, swing, 0);
              if (wrongGuesses >= 5) drawLeftLeg(ctx, t, bodyI, swing, 0);
              if (wrongGuesses >= 6) drawRightLeg(ctx, t, bodyI, swing, 0);
            }

            // ── Rope glow effect building to snap ──
            const glowProg = Math.min(1, elapsed / Math.max(0.01, ROPE_SNAP));
            drawRopeGlow(
              ctx,
              A.ropeTop.x,
              A.ropeTop.y,
              ropeEndY + 10,
              glowProg,
              t,
            );

            // ── Speech bubble ──
            drawWinSpeechBubble(
              ctx,
              headInfo.cx,
              headInfo.cy,
              elapsed < 0.3 ? "I DID IT!! \uD83C\uDF89" : "The rope... \u2728",
            );
          } else {
            // Won with 0 mistakes — show excited idle man
            drawIdleWaiting(ctx, t);
            ctx.save();
            ctx.font = "bold 12px system-ui, sans-serif";
            ctx.fillStyle = "#fbbf24";
            ctx.shadowColor = "#f59e0b";
            ctx.shadowBlur = 10;
            ctx.textAlign = "center";
            ctx.fillText("PERFECT! \uD83C\uDFAF", BASE_X, 130);
            ctx.restore();
          }
        }
      } else if (lost) {
        // ── DEATH ──
        const {swing, ropeEndY} = drawRope(ctx, t, wrongGuesses, creak, mood);
        const headInfo = drawHead(ctx, t * 0.25, 5, 1, swing * 0.3, ropeEndY);
        const bodyInfo = drawBody(
          ctx,
          t * 0.25,
          headInfo.bob,
          swing * 0.3,
          ropeEndY,
          5,
        );
        drawLeftArm(ctx, t * 0.25, bodyInfo, swing * 0.3, 0);
        drawRightArm(ctx, t * 0.25, bodyInfo, swing * 0.3, 0);
        drawLeftLeg(ctx, t * 0.25, bodyInfo, swing * 0.3, 0);
        drawRightLeg(ctx, t * 0.25, bodyInfo, swing * 0.3, 0);
        drawGhost(ctx, t, deathTimeRef.current);
        drawTombstone(ctx, t);
      } else {
        // ── ALIVE ──
        const {swing, ropeEndY} = drawRope(ctx, t, wrongGuesses, creak, mood);
        let headBob = 0;
        let bodyInfo = null;

        // Draw a waiting idle figure when no wrong guesses
        if (wrongGuesses === 0) {
          drawIdleWaiting(ctx, t);
          drawFly(ctx, t);
        }

        if (wrongGuesses >= 1) {
          const headInfo = drawHead(
            ctx,
            t,
            mood,
            blinkState.current,
            swing,
            ropeEndY,
          );
          headBob = headInfo.bob;
          drawFly(ctx, t);

          if (wrongGuesses >= 1) {
            drawSpeechBubble(ctx, wrongGuesses, headInfo.cx, headInfo.cy, t);
          }
        }
        if (wrongGuesses >= 2) {
          bodyInfo = drawBody(ctx, t, headBob, swing, ropeEndY, mood);
        }
        if (wrongGuesses >= 3 && bodyInfo) {
          drawLeftArm(ctx, t, bodyInfo, swing, mood);
        }
        if (wrongGuesses >= 4 && bodyInfo) {
          drawRightArm(ctx, t, bodyInfo, swing, mood);
        }
        if (wrongGuesses >= 5 && bodyInfo) {
          drawLeftLeg(ctx, t, bodyInfo, swing, mood);
        }
        if (wrongGuesses >= 6 && bodyInfo) {
          drawRightLeg(ctx, t, bodyInfo, swing, mood);
        }
      }

      // ── Floating emojis (always) ──
      drawFloatingEmojis(ctx, emojisRef.current);

      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);

    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [wrongGuesses, lost, won, getMood]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{background: "transparent", maxWidth: "100%", height: "auto"}}
    />
  );
}
