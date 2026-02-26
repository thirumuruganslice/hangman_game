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
  headCtr: {x: BASE_X, y: 98},
  headR: 24,
  neckY: 122,
  shoulderY: 145,
  bodyBot: {x: BASE_X, y: 205},
  hipY: 205,
  lArm: {x: 168, y: 185},
  rArm: {x: 252, y: 185},
  lLeg: {x: 170, y: 265},
  rLeg: {x: 250, y: 265},
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
  if (wrongGuesses === 0) return {swing: 0, ropeEndY: 74};
  ctx.save();

  // Pendulum physics: more sway = more guesses
  const freq = 1.0 + mood * 0.3;
  const amp = 2 + mood * 1.5;
  const swing = Math.sin(t * freq) * amp;

  // Tension: rope stretches slightly with more body parts
  const tension = wrongGuesses * 1.2;
  const ropeBaseY = 74 + tension;

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
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function HangmanCanvas({wrongGuesses, lost, won}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const confettiRef = useRef(null);
  const deathTimeRef = useRef(null);
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

      // ── Rope ──
      const {swing, ropeEndY} = drawRope(ctx, t, wrongGuesses, creak, mood);

      if (won) {
        // ── VICTORY ──
        drawVictoryPose(ctx, t);
        if (confettiRef.current) drawConfetti(ctx, confettiRef.current, t);
        // Victory emojis
        if (Math.random() < 0.05) {
          const vEmojis = ["🎉", "⭐", "🔥", "💃", "🕺", "✨", "🎊"];
          spawnEmoji(
            emojisRef.current,
            vEmojis[Math.floor(Math.random() * vEmojis.length)],
            Math.random() * W,
            H,
          );
        }
      } else if (lost) {
        // ── DEATH ──
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
      style={{background: "transparent"}}
    />
  );
}
