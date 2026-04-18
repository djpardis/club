// Generate social + print cards (front + back).
//
// Text is converted to SVG <path> elements using the real Space Grotesk TTF
// so the output is pixel-perfect and doesn't depend on any system fonts.
//
// Outputs in src/static/:
//   og.png                     1200x630  social, cream bg
//   og-back.png                1200x630  social, cream bg
//   card-front.png             1125x675  300dpi print, cream bg (3.75" x 2.25" with 1/8" bleed)
//   card-back.png              1125x675  300dpi print, cream bg
//   card-front-transparent.png 1125x675  300dpi print, transparent bg (cardboard shows through)
//   card-back-transparent.png  1125x675  300dpi print, transparent bg
//
// Run: node scripts/gen-og.mjs
import sharp from "sharp";
import opentype from "opentype.js";
import QRCode from "qrcode";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

// Palette — matches src/css/tokens.css
const CREAM = "#f5ede0";
const INK = "#1a1814";
const YELLOW = "#ffff99";
const PINK = "#ff00aa";
const MUTED = "#6b645a";
const PURPLE = "#7d78b5";

const VB_W = 1200;
const VB_H = 630;
const QR_URL = "https://djpardis.club";

// Load fonts once.
const fontBold = opentype.loadSync(resolve("scripts/fonts/SpaceGrotesk-Bold.ttf"));
const fontMedium = opentype.loadSync(resolve("scripts/fonts/SpaceGrotesk-Medium.ttf"));

// Render a text string into a single SVG <path d="..."> using the given font.
// We return both the path `d` attribute and the measured width so callers can
// centre or left-align precisely.
function textPath(font, text, fontSize, { letterSpacing = 0 } = {}) {
  // opentype.js doesn't support letter-spacing directly; we build glyph paths
  // manually, advancing by (glyph advance + letterSpacing).
  const glyphs = font.stringToGlyphs(text);
  const scale = (1 / font.unitsPerEm) * fontSize;
  let x = 0;
  const fullPath = new opentype.Path();
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    const gp = g.getPath(x, 0, fontSize);
    fullPath.extend(gp);
    x += g.advanceWidth * scale + letterSpacing;
    // Default kerning between consecutive glyphs.
    if (i < glyphs.length - 1) {
      const kern = font.getKerningValue(g, glyphs[i + 1]) * scale;
      x += kern;
    }
  }
  const width = x - (glyphs.length ? letterSpacing : 0);
  return { d: fullPath.toPathData(2), width };
}

// Position a text-path inside the SVG. `align` is "left" | "center" | "right".
function textSvg(font, text, fontSize, { x, y, align = "left", fill = INK, letterSpacing = 0 }) {
  const { d, width } = textPath(font, text, fontSize, { letterSpacing });
  let tx = x;
  if (align === "center") tx = x - width / 2;
  else if (align === "right") tx = x - width;
  return {
    svg: `<path d="${d}" fill="${fill}" transform="translate(${tx} ${y})" />`,
    width,
  };
}

function shell(innerSvg, { transparent = false } = {}) {
  const bg = transparent
    ? ""
    : `<rect x="0" y="0" width="${VB_W}" height="${VB_H}" fill="${CREAM}" />`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}">
  ${bg}
  ${innerSvg}
</svg>`;
}

// Generate a QR code as an SVG <g> made of filled squares. High error
// correction ("H") keeps it scannable even if it gets smudged or printed on
// rough stock. Each module (pixel) becomes a rect of the given `moduleSize`.
async function qrSvg(text, { x, y, size, dark = INK }) {
  const qr = await QRCode.create(text, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const moduleSize = size / n;
  let d = "";
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (qr.modules.get(row, col)) {
        const px = col * moduleSize;
        const py = row * moduleSize;
        d += `M${px},${py}h${moduleSize}v${moduleSize}h-${moduleSize}z`;
      }
    }
  }
  return `<g transform="translate(${x} ${y})"><path d="${d}" fill="${dark}" /></g>`;
}

// ---------- FRONT ----------
// Mirrors the site hero exactly: left-aligned block with "DJ" / "PARDIS"
// (tight line-height 0.88, yellow highlight on PARDIS), then a tagline
// "Pop house · West Coast · Booking worldwide" with "Pop house" in pink.
function frontSvg({ transparent = false } = {}) {
  const padX = 100;
  const titleSize = 200;
  // Match .wordmark-display line-height: 0.88
  const lineHeight = titleSize * 0.88;
  const tagSize = 44;

  // Measure everything first so we can vertically centre the block.
  const dj = textPath(fontBold, "DJ", titleSize, { letterSpacing: -8 });
  const pardis = textPath(fontBold, "PARDIS", titleSize, { letterSpacing: -8 });
  // Subtitle on a single line: "POP HOUSE · WEST COAST · BOOKING WORLDWIDE"
  // — bold all-caps purple with a pink highlight (white text) behind POP HOUSE.
  const pop = textPath(fontBold, "POP HOUSE", tagSize, { letterSpacing: 0.5 });
  const sepStr = " · ";
  const sep1 = textPath(fontBold, sepStr, tagSize, { letterSpacing: 0.5 });
  const west = textPath(fontBold, "WEST COAST", tagSize, { letterSpacing: 0.5 });
  const sep2 = textPath(fontBold, sepStr, tagSize, { letterSpacing: 0.5 });
  const book = textPath(fontBold, "BOOKING WORLDWIDE", tagSize, { letterSpacing: 0.5 });
  const tagGap = 56;

  // Total block height: cap of DJ + leading to PARDIS baseline + one tag line.
  const capHeight = titleSize * 0.72;
  const titleTopToBaseline = capHeight;
  const totalH = titleTopToBaseline + lineHeight + tagGap + tagSize;
  const topY = (VB_H - totalH) / 2;

  const djBaseline = topY + titleTopToBaseline;
  const pardisBaseline = djBaseline + lineHeight;
  const tagBaseline = pardisBaseline + tagGap + tagSize * 0.82;

  // Yellow highlight behind PARDIS — hugging tight like the site .hl rule
  // (padding 0.02em 0.1em 0.06em).
  const hlPadX = titleSize * 0.1;
  const hlPadTop = titleSize * 0.04;
  const hlPadBottom = titleSize * 0.12;
  const hlX = padX - hlPadX;
  const hlY = pardisBaseline - capHeight - hlPadTop;
  const hlW = pardis.width + hlPadX * 2;
  const hlH = capHeight + hlPadTop + hlPadBottom;

  // Subtitle on one line. "POP HOUSE" is white on top of its pink highlight;
  // the rest of the line is purple.
  let cursor = padX;
  const tagPieces = [
    { piece: pop, fill: "#ffffff" },
    { piece: sep1, fill: PURPLE },
    { piece: west, fill: PURPLE },
    { piece: sep2, fill: PURPLE },
    { piece: book, fill: PURPLE },
  ]
    .map(({ piece, fill }) => {
      const svg = `<path d="${piece.d}" fill="${fill}" transform="translate(${cursor} ${tagBaseline})" />`;
      cursor += piece.width;
      return svg;
    })
    .join("\n");

  // Pink highlight behind POP HOUSE (matches site .hl-pink vibe).
  const tagCapH = tagSize * 0.72;
  const popHlPadX = tagSize * 0.14;
  const popHlPadTop = tagSize * 0.08;
  const popHlPadBottom = tagSize * 0.16;
  const popHlX = padX - popHlPadX;
  const popHlY = tagBaseline - tagCapH - popHlPadTop;
  const popHlW = pop.width + popHlPadX * 2;
  const popHlH = tagCapH + popHlPadTop + popHlPadBottom;

  const inner = `
    <rect x="${hlX}" y="${hlY}" width="${hlW}" height="${hlH}" fill="${YELLOW}" />
    <path d="${dj.d}" fill="${INK}" transform="translate(${padX} ${djBaseline})" />
    <path d="${pardis.d}" fill="${INK}" transform="translate(${padX} ${pardisBaseline})" />
    <rect x="${popHlX}" y="${popHlY}" width="${popHlW}" height="${popHlH}" fill="${PINK}" />
    ${tagPieces}
  `;
  return shell(inner, { transparent });
}

// ---------- BACK ----------
// Purple QR code on the left linking to djpardis.club, "@djpardis.club" (pink)
// centred vertically in the right column.
async function backSvg({ transparent = false } = {}) {
  const padX = 80;
  const qrSize = 440;
  const qrX = padX;
  const qrY = (VB_H - qrSize) / 2;
  const qr = await qrSvg(QR_URL, { x: qrX, y: qrY, size: qrSize, dark: PURPLE });

  const colX = qrX + qrSize + 60;
  const handleSize = 76;
  const handle = textPath(fontBold, "@djpardis.club", handleSize, { letterSpacing: -2 });
  const handleBaseline = VB_H / 2 + handleSize * 0.28;

  const inner = `
    ${qr}
    <path d="${handle.d}" fill="${PINK}" transform="translate(${colX} ${handleBaseline})" />
  `;
  return shell(inner, { transparent });
}

async function render({ svg, outPath, width, height, dpi }) {
  const abs = resolve(process.cwd(), outPath);
  mkdirSync(dirname(abs), { recursive: true });
  let pipeline = sharp(Buffer.from(svg), { density: Math.max(dpi ?? 72, 300) })
    .resize(width, height, { fit: "fill" })
    .png({ compressionLevel: 9 });
  if (dpi) pipeline = pipeline.withMetadata({ density: dpi });
  await pipeline.toFile(abs);
  console.log(`wrote ${outPath}  (${width}x${height}${dpi ? `, ${dpi}dpi` : ""})`);
}

const front = frontSvg();
const back = await backSvg();
const frontT = frontSvg({ transparent: true });
const backT = await backSvg({ transparent: true });

// Social / Open Graph
await render({ svg: front, outPath: "src/static/og.png", width: 1200, height: 630 });
await render({ svg: back, outPath: "src/static/og-back.png", width: 1200, height: 630 });

// Business card with bleed — cream bg
await render({ svg: front, outPath: "src/static/card-front.png", width: 1125, height: 675, dpi: 300 });
await render({ svg: back, outPath: "src/static/card-back.png", width: 1125, height: 675, dpi: 300 });

// Transparent — for printing on cardboard / kraft.
await render({
  svg: frontT,
  outPath: "src/static/card-front-transparent.png",
  width: 1125,
  height: 675,
  dpi: 300,
});
await render({
  svg: backT,
  outPath: "src/static/card-back-transparent.png",
  width: 1125,
  height: 675,
  dpi: 300,
});
