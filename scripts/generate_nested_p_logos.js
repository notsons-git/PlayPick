const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.disableHardwareAcceleration();

const ACCENT = '#98CB00';
const ACCENT_BRIGHT = '#B5FF00';
const BG_DARK = '#141613';
const BG_SQUIRCLE = '#181B16';
const BORDER = '#2B3026';

const concepts = [
  {
    name: 'pp_nested_1_solid_negative',
    title: 'Nested P: Negative Space Play',
    desc: 'Массивная внешняя "P" цвета Neon Lime, внутри которой в негативном пространстве вырезана вторая "P" со стрелкой Play в сердцевине. Максимальная читаемость с любого расстояния.',
    svg: `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgGradP1" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stop-color="#20241d"/>
            <stop offset="100%" stop-color="#121411"/>
          </radialGradient>
          <linearGradient id="limeGradP1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#AEFF00"/>
            <stop offset="100%" stop-color="#90C200"/>
          </linearGradient>
          <filter id="subtleShadowP1" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="0.6"/>
          </filter>
        </defs>

        <!-- Squircle Background -->
        <rect x="20" y="20" width="472" height="472" rx="108" fill="url(#bgGradP1)" stroke="#2D3227" stroke-width="4"/>

        <!-- Outer Large 'P' (Solid Lime with Negative Cutouts) -->
        <g filter="url(#subtleShadowP1)">
          <!-- Outer P Shape: Left stem from x=124 to x=194, Bowl extends to x=388, y from 104 to 408 -->
          <path d="
            M 124 104
            L 286 104
            C 346 104 388 142 388 206
            C 388 270 346 308 286 308
            L 194 308
            L 194 408
            L 124 408
            Z
            
            M 194 154
            L 272 154
            C 304 154 326 174 326 206
            C 326 238 304 258 272 258
            L 194 258
            Z
          "
          fill="url(#limeGradP1)"
          fill-rule="evenodd"
          />

          <!-- Inner 'P' nested in the counter: Stem and Play Loop -->
          <!-- Inner P sits inside the counter (x=194 to 326, y=154 to 258) and extends down slightly -->
          <!-- Inner stem -->
          <rect x="214" y="174" width="22" height="64" rx="4" fill="#AEFF00"/>
          
          <!-- Inner P Loop / Play Triangle pointing right -->
          <path d="
            M 236 174
            L 268 174
            C 288 174 298 186 298 198
            C 298 210 288 222 268 222
            L 236 222
            Z"
            fill="#AEFF00"
          />

          <!-- Cutout inside the inner P creating the Play triangle -->
          <polygon points="244,184 274,198 244,212" fill="#121411"/>
        </g>
      </svg>
    `
  },
  {
    name: 'pp_nested_2_dual_strokes',
    title: 'Nested P: Dual Contour & Play Core',
    desc: 'Две геометрические "P" в виде чистых параллельных контуров: внешняя крупная P охватывает внутреннюю P, образующую стрелку Play. Лаконичный, суперсовременный стиль.',
    svg: `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgGradP2" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stop-color="#21251e"/>
            <stop offset="100%" stop-color="#121411"/>
          </radialGradient>
          <linearGradient id="limeGradP2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#B8FF00"/>
            <stop offset="100%" stop-color="#98CB00"/>
          </linearGradient>
          <filter id="subtleGlowP2" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Squircle Background -->
        <rect x="20" y="20" width="472" height="472" rx="108" fill="url(#bgGradP2)" stroke="#2D3227" stroke-width="4"/>

        <g transform="translate(8, 0)" filter="url(#subtleGlowP2)">
          <!-- Outer 'P' Stroke (Thickness: 32px) -->
          <!-- Stem: x=136, y=100 to 412. Bowl: curves to x=376, back to x=136 at y=276 -->
          <path d="
            M 136 412
            L 136 100
            L 264 100
            C 334 100 376 138 376 188
            C 376 238 334 276 264 276
            L 136 276"
            fill="none"
            stroke="url(#limeGradP2)"
            stroke-width="32"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Inner 'P' nested inside (Thickness: 24px) -->
          <!-- Offset by ~48px inward -->
          <path d="
            M 200 340
            L 200 162
            L 258 162
            C 288 162 308 175 308 198
            C 308 221 288 234 258 234
            L 200 234"
            fill="none"
            stroke="#E8EBE4"
            stroke-width="22"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Center Play Dot / Selector Arrow in Lime -->
          <polygon points="236,186 262,198 236,210" fill="url(#limeGradP2)"/>
        </g>
      </svg>
    `
  },
  {
    name: 'pp_nested_3_interlocking_bold',
    title: 'Nested P: Interlocking Monogram (Play & Pick)',
    desc: 'Две контрастные буквы "P", вложенные друг в друга с чистым зазором: внешняя титановая с неоновым контуром, внутренняя — неоновая со стрелкой Play. Читается моментально.',
    svg: `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgGradP3" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stop-color="#20241d"/>
            <stop offset="100%" stop-color="#121411"/>
          </radialGradient>
          <linearGradient id="limeGradP3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#C0FF00"/>
            <stop offset="100%" stop-color="#98CB00"/>
          </linearGradient>
          <filter id="shadowP3" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.6"/>
          </filter>
        </defs>

        <!-- Squircle Background -->
        <rect x="20" y="20" width="472" height="472" rx="108" fill="url(#bgGradP3)" stroke="#2D3227" stroke-width="4"/>

        <!-- Ambient Core Glow -->
        <circle cx="260" cy="240" r="100" fill="#98CB00" opacity="0.12"/>

        <g filter="url(#shadowP3)">
          <!-- Outer P (Dark Graphite with Crisp Neon Lime Outline) -->
          <path d="
            M 120 108
            L 270 108
            C 340 108 392 152 392 220
            C 392 288 340 332 270 332
            L 196 332
            L 196 404
            L 120 404
            Z"
            fill="#1d211a"
            stroke="url(#limeGradP3)"
            stroke-width="8"
            stroke-linejoin="round"
          />

          <!-- Inner P (Solid Glowing Lime #98CB00 nested inside the loop) -->
          <!-- Placed perfectly inside the upper bowl with a crisp margin -->
          <path d="
            M 196 166
            L 264 166
            C 300 166 328 190 328 220
            C 328 250 300 274 264 274
            L 196 274
            Z"
            fill="url(#limeGradP3)"
          />

          <!-- Cutout inside the Inner P forming a sharp forward Play Triangle (▶) -->
          <polygon points="228,190 286,220 228,250" fill="#121411"/>
        </g>
      </svg>
    `
  },
  {
    name: 'pp_nested_4_pure_geometric',
    title: 'Nested P: Pure Geometric Minimal',
    desc: 'Предельный минимализм: две геометрические "P", где внутренняя "P" является строгим продолжением и зеркалом внешней, а её сердцевина — чистый треугольник запуска игры. Ноль лишних деталей.',
    svg: `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgGradP4" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stop-color="#1f231c"/>
            <stop offset="100%" stop-color="#111310"/>
          </radialGradient>
          <linearGradient id="limeGradP4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#B8FF00"/>
            <stop offset="100%" stop-color="#98CB00"/>
          </linearGradient>
          <filter id="shadowP4" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.5"/>
          </filter>
        </defs>

        <!-- Squircle Background -->
        <rect x="20" y="20" width="472" height="472" rx="108" fill="url(#bgGradP4)" stroke="#2B3025" stroke-width="4"/>

        <!-- The Nested Dual P Construction -->
        <g filter="url(#shadowP4)">
          <!-- Outer 'P' (Bold Neon Lime) -->
          <!-- Outer contour -->
          <path d="
            M 130 96
            L 280 96
            C 350 96 400 142 400 216
            C 400 290 350 336 280 336
            L 204 336
            L 204 416
            L 130 416
            Z"
            fill="url(#limeGradP4)"
          />

          <!-- The nested inner 'P' cutout (Graphite) -->
          <path d="
            M 204 156
            L 268 156
            C 306 156 332 182 332 216
            C 332 250 306 276 268 276
            L 204 276
            L 204 356
            L 242 356
            L 242 308
            L 268 308
            C 324 308 368 268 368 216
            C 368 164 324 124 268 124
            L 204 124
            Z"
            fill="#111310"
          />

          <!-- Inner Play Core triangle inside the inner loop -->
          <polygon points="234,188 288,216 234,244" fill="url(#limeGradP4)"/>
        </g>
      </svg>
    `
  }
];

const outDir = path.resolve(__dirname, '..', 'icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      width: 512,
      height: 512,
      show: false,
      frame: false,
      transparent: true,
      webPreferences: {
        offscreen: true,
      },
    });

    console.log('Rendering', concepts.length, 'nested "P in P" logos...');

    for (const c of concepts) {
      // 1. Save SVG
      const svgPath = path.join(outDir, `${c.name}.svg`);
      fs.writeFileSync(svgPath, c.svg.trim(), 'utf8');

      // 2. Render to PNG
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 512px; height: 512px; overflow: hidden; background: transparent; }
            svg { display: block; width: 512px; height: 512px; }
          </style>
        </head>
        <body>
          ${c.svg.trim()}
        </body>
        </html>
      `;

      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await new Promise((r) => setTimeout(r, 200));

      const image = await win.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 });
      const pngBuffer = image.toPNG();
      const pngPath = path.join(outDir, `${c.name}.png`);
      fs.writeFileSync(pngPath, pngBuffer);

      console.log(`✓ Rendered ${c.name}.png (${pngBuffer.length} bytes)`);
    }

    console.log('Done rendering all nested "P in P" logos!');
  } catch (err) {
    console.error('Error during render:', err);
  } finally {
    app.quit();
  }
});
