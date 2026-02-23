import {useEffect, useRef} from "react";

// ── Gallows ──────────────────────────────────────────────────
function drawGallows(ctx) {
  ctx.clearRect(0, 0, 300, 360);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Ground shadow
  const grd = ctx.createLinearGradient(20, 318, 200, 330);
  grd.addColorStop(0, "rgba(30,41,59,0)");
  grd.addColorStop(0.5, "rgba(30,41,59,0.45)");
  grd.addColorStop(1, "rgba(30,41,59,0)");
  ctx.strokeStyle = grd;
  ctx.lineWidth = 7;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(20, 322);
  ctx.lineTo(200, 322);
  ctx.stroke();

  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 6;
  ctx.shadowColor = "rgba(30,41,59,0.2)";
  ctx.shadowBlur = 8;

  // Vertical pole
  ctx.beginPath();
  ctx.moveTo(75, 320);
  ctx.lineTo(75, 28);
  ctx.stroke();

  // Top beam
  ctx.beginPath();
  ctx.moveTo(74, 28);
  ctx.lineTo(210, 28);
  ctx.stroke();

  // Support strut
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(75, 100);
  ctx.lineTo(115, 60);
  ctx.stroke();

  // Noose rope (wavy)
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#fbbf24";
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.moveTo(210, 28);
  ctx.lineTo(210, 74);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.restore();
}

// ── Helpers ───────────────────────────────────────────────────
function glowStroke(ctx, color, lw = 4) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function drawSweat(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = "#38bdf8";
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.ellipse(x, y, 3, 5, Math.PI * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Body parts ────────────────────────────────────────────────
const BODY_PARTS = [
  // 0 HEAD
  (ctx, lost, worried) => {
    ctx.save();
    glowStroke(ctx, "#f97316", 4);
    // wobble ring if worried
    if (worried) {
      ctx.strokeStyle = "#ef4444";
      ctx.shadowColor = "#ef4444";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(210, 98, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Head
    ctx.strokeStyle = "#f97316";
    ctx.shadowColor = "#f97316";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(210, 98, 24, 0, Math.PI * 2);
    ctx.stroke();

    if (lost) {
      // --- LOST face: X eyes + sad mouth + tears ---
      ctx.fillStyle = "#ef4444";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 6;
      ctx.lineWidth = 3;
      // X left eye
      ctx.beginPath();
      ctx.moveTo(200, 91);
      ctx.lineTo(206, 97);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(206, 91);
      ctx.lineTo(200, 97);
      ctx.stroke();
      // X right eye
      ctx.beginPath();
      ctx.moveTo(214, 91);
      ctx.lineTo(220, 97);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(220, 91);
      ctx.lineTo(214, 97);
      ctx.stroke();
      // tears
      ctx.fillStyle = "#60a5fa";
      ctx.shadowColor = "#60a5fa";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.ellipse(203, 100, 2, 4, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(217, 100, 2, 4, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // sad wavy mouth
      ctx.strokeStyle = "#f97316";
      ctx.shadowColor = "#f97316";
      ctx.shadowBlur = 6;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(200, 112);
      ctx.bezierCurveTo(204, 108, 216, 108, 220, 112);
      ctx.stroke();
    } else if (worried) {
      // --- WORRIED face: big eyes + sweat + squiggly mouth ---
      ctx.fillStyle = "#f97316";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(203, 93, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(217, 93, 4, 0, Math.PI * 2);
      ctx.fill();
      // pupils
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(204, 94, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(218, 94, 2, 0, Math.PI * 2);
      ctx.fill();
      // sweat drops
      drawSweat(ctx, 226, 88);
      drawSweat(ctx, 230, 98);
      // worried mouth
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#f97316";
      ctx.beginPath();
      ctx.moveTo(200, 109);
      ctx.bezierCurveTo(205, 114, 211, 106, 220, 110);
      ctx.stroke();
    } else {
      // --- NORMAL face: round eyes + slight smile ---
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(203, 93, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(217, 93, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#f97316";
      ctx.beginPath();
      ctx.arc(210, 101, 7, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    ctx.restore();
  },

  // 1 BODY
  (ctx) => {
    ctx.save();
    glowStroke(ctx, "#a78bfa");
    ctx.beginPath();
    ctx.moveTo(210, 122);
    ctx.lineTo(210, 205);
    ctx.stroke();
    // tiny heart on chest
    ctx.fillStyle = "#f472b6";
    ctx.shadowColor = "#f472b6";
    ctx.shadowBlur = 8;
    ctx.font = "13px serif";
    ctx.fillText("♥", 203, 155);
    ctx.restore();
  },

  // 2 LEFT ARM
  (ctx) => {
    ctx.save();
    glowStroke(ctx, "#34d399");
    ctx.beginPath();
    ctx.moveTo(210, 145);
    ctx.lineTo(168, 185);
    ctx.stroke();
    // hand
    ctx.fillStyle = "#34d399";
    ctx.shadowColor = "#34d399";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(165, 187, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // 3 RIGHT ARM
  (ctx) => {
    ctx.save();
    glowStroke(ctx, "#34d399");
    ctx.beginPath();
    ctx.moveTo(210, 145);
    ctx.lineTo(252, 185);
    ctx.stroke();
    ctx.fillStyle = "#34d399";
    ctx.shadowColor = "#34d399";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(255, 187, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // 4 LEFT LEG
  (ctx) => {
    ctx.save();
    glowStroke(ctx, "#60a5fa");
    ctx.beginPath();
    ctx.moveTo(210, 205);
    ctx.lineTo(170, 265);
    ctx.stroke();
    // shoe
    ctx.fillStyle = "#60a5fa";
    ctx.shadowColor = "#60a5fa";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(165, 268, 10, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // 5 RIGHT LEG
  (ctx) => {
    ctx.save();
    glowStroke(ctx, "#60a5fa");
    ctx.beginPath();
    ctx.moveTo(210, 205);
    ctx.lineTo(250, 265);
    ctx.stroke();
    ctx.fillStyle = "#60a5fa";
    ctx.shadowColor = "#60a5fa";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(255, 268, 10, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
];

export default function HangmanCanvas({wrongGuesses, lost}) {
  const canvasRef = useRef(null);
  const worried = wrongGuesses >= 4 && !lost;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    drawGallows(ctx);
    for (let i = 0; i < wrongGuesses; i++) {
      if (i === 0) BODY_PARTS[0](ctx, lost, worried);
      else BODY_PARTS[i](ctx);
    }
    if (lost && wrongGuesses >= 1) {
      // redraw head with X eyes on top
      BODY_PARTS[0](ctx, true, false);
    }

    // "HELP!" speech bubble when worried
    if (worried && !lost) {
      ctx.save();
      ctx.fillStyle = "#fef08a";
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(228, 60, 52, 24, 8);
      ctx.fill();
      ctx.fillStyle = "#1e293b";
      ctx.shadowBlur = 0;
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("HELP! 😱", 232, 76);
      ctx.restore();
    }

    // "RIP" tombstone if lost
    if (lost) {
      ctx.save();
      ctx.fillStyle = "#374151";
      ctx.shadowColor = "#9ca3af";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(185, 285, 50, 35, [12, 12, 4, 4]);
      ctx.fill();
      ctx.fillStyle = "#e2e8f0";
      ctx.shadowBlur = 0;
      ctx.font = "bold 12px serif";
      ctx.fillText("R.I.P", 192, 302);
      ctx.font = "9px serif";
      ctx.fillText("GG 💀", 193, 314);
      ctx.restore();
    }
  }, [wrongGuesses, lost, worried]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={360}
      style={{background: "transparent"}}
    />
  );
}
