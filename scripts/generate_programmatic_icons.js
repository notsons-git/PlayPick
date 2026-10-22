const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.disableHardwareAcceleration();

// Palette
const ACCENT = '#98CB00';
const ACCENT_GLOW = '#B8FF00';
const ACCENT_DIM = 'rgba(152, 203, 0, 0.25)';
const BG_DARK = '#141613';
const BG_SURFACE = '#1E211B';
const BORDER = '#30342C';
const TEXT = '#E8EBE4';

// 5 programmatic SVG designs (512x512)
const designs = [
  {
    name: 'icon_1_roulette_gamepad',
    title: 'Roulette Gamepad',
    desc: 'Колесо рулетки со стрелкой-селектором и контуром геймпада с кнопкой Play в центре',
    svg: `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgGrad1" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stop-color="#232720"/>
            <stop offset="70%" stop-color="#141613"/>
            <stop offset="100%" stop-color="#0c0e0b"/>
          </radialGradient>
          <linearGradient id="limeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#B8FF00"/>
            <stop offset="100%" stop-color="#98CB00"/>
          </linearGradient>
          <filter id="neonGlow1" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="subtleGlow1" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Background Rounded Squircle -->
        <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bgGrad1)" stroke="#32372d" stroke-width="4"/>
        <rect x="24" y="24" width="464" height="464" rx="100" fill="none" stroke="#98CB00" stroke-width="1.5" stroke-opacity="0.2"/>

        <!-- Outer Roulette Dial Ring -->
        <circle cx="256" cy="256" r="190" fill="none" stroke="#252922" stroke-width="16"/>
        <circle cx="256" cy="256" r="190" fill="none" stroke="url(#limeGrad1)" stroke-width="4" stroke-dasharray="8 16" opacity="0.6"/>
        
        <!-- Roulette Sector Highlights -->
        <circle cx="256" cy="256" r="172" fill="none" stroke="#1d201a" stroke-width="8"/>
        <!-- Active Spinning Roulette Arc -->
        <path d="M 256 66 A 190 190 0 0 1 425 170" fill="none" stroke="url(#limeGrad1)" stroke-width="10" stroke-linecap="round" filter="url(#neonGlow1)"/>
        
        <!-- Top Roulette Needle / Selector Marker pointing down -->
        <polygon points="256,58 244,90 268,90" fill="url(#limeGrad1)" filter="url(#neonGlow1)"/>
        <circle cx="256" cy="58" r="5" fill="#FFFFFF"/>

        <!-- Ambient Glow behind Controller -->
        <circle cx="256" cy="265" r="110" fill="#98CB00" opacity="0.12" filter="url(#neonGlow1)"/>

        <!-- Gamepad Base Body -->
        <path d="
          M 175 185
          C 140 185 105 210 98 255
          C 88 320 120 365 155 355
          C 178 348 190 315 215 315
          L 297 315
          C 322 315 334 348 357 355
          C 392 365 424 320 414 255
          C 407 210 372 185 337 185
          C 305 185 288 202 256 202
          C 224 202 207 185 175 185 Z"
          fill="#1c1f19" stroke="#363c30" stroke-width="6"/>

        <path d="
          M 175 185
          C 140 185 105 210 98 255
          C 88 320 120 365 155 355
          C 178 348 190 315 215 315
          L 297 315
          C 322 315 334 348 357 355
          C 392 365 424 320 414 255
          C 407 210 372 185 337 185
          C 305 185 288 202 256 202
          C 224 202 207 185 175 185 Z"
          fill="none" stroke="url(#limeGrad1)" stroke-width="3" stroke-opacity="0.8" filter="url(#subtleGlow1)"/>

        <!-- Left D-Pad -->
        <g transform="translate(148, 255)">
          <rect x="-7" y="-22" width="14" height="44" rx="4" fill="#292e24" stroke="#42493a" stroke-width="2"/>
          <rect x="-22" y="-7" width="44" height="14" rx="4" fill="#292e24" stroke="#42493a" stroke-width="2"/>
          <circle cx="0" cy="0" r="4" fill="#98CB00"/>
        </g>

        <!-- Right Action Buttons -->
        <g transform="translate(364, 255)">
          <circle cx="0" cy="-16" r="6.5" fill="#292e24" stroke="url(#limeGrad1)" stroke-width="2"/>
          <circle cx="16" cy="0" r="6.5" fill="#292e24" stroke="#42493a" stroke-width="2"/>
          <circle cx="0" cy="16" r="6.5" fill="#292e24" stroke="#42493a" stroke-width="2"/>
          <circle cx="-16" cy="0" r="6.5" fill="#292e24" stroke="#42493a" stroke-width="2"/>
          <circle cx="0" cy="-16" r="3" fill="#B8FF00"/>
        </g>

        <!-- Center Glowing Play Triangle (The "Play" in PlayPick) -->
        <polygon points="244,232 278,255 244,278" fill="url(#limeGrad1)" filter="url(#neonGlow1)"/>
        <polygon points="244,232 278,255 244,278" fill="#FFFFFF" opacity="0.3"/>
      </svg>
    `
  },
  {
    name: 'icon_2_cyber_dice_roulette',
    title: 'Cyber Dice & Roulette Pick',
    desc: 'Изометрический 3D-куб с неоновыми гранями (кнопка Play, D-Pad и прицел) и вращающейся орбитой рулетки',
    svg: `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgGrad2" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stop-color="#21251e"/>
            <stop offset="70%" stop-color="#141613"/>
            <stop offset="100%" stop-color="#0b0d0a"/>
          </radialGradient>
          <linearGradient id="limeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#C5FF00"/>
            <stop offset="100%" stop-color="#98CB00"/>
          </linearGradient>
          <linearGradient id="topFaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#2d3328"/>
            <stop offset="100%" stop-color="#1f231b"/>
          </linearGradient>
          <linearGradient id="leftFaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1b1e17"/>
            <stop offset="100%" stop-color="#131510"/>
          </linearGradient>
          <linearGradient id="rightFaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#24291f"/>
            <stop offset="100%" stop-color="#171a14"/>
          </linearGradient>
          <filter id="neonGlow2" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="9" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Squircle Base -->
        <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bgGrad2)" stroke="#32372d" stroke-width="4"/>
        <rect x="24" y="24" width="464" height="464" rx="100" fill="none" stroke="#98CB00" stroke-width="1.5" stroke-opacity="0.15"/>

        <!-- Orbiting Roulette Ring in Perspective -->
        <ellipse cx="256" cy="270" rx="195" ry="85" fill="none" stroke="#252b20" stroke-width="12" transform="rotate(-15 256 270)"/>
        <ellipse cx="256" cy="270" rx="195" ry="85" fill="none" stroke="url(#limeGrad2)" stroke-width="5" stroke-dasharray="14 24" opacity="0.7" transform="rotate(-15 256 270)"/>
        
        <!-- Glowing Roulette Sector Segment -->
        <path d="M 120 200 A 195 85 0 0 1 290 190" fill="none" stroke="url(#limeGrad2)" stroke-width="12" stroke-linecap="round" transform="rotate(-15 256 270)" filter="url(#neonGlow2)"/>
        <circle cx="95" cy="235" r="7" fill="#C5FF00" filter="url(#neonGlow2)"/>

        <!-- Isometric Die Center Glow -->
        <circle cx="256" cy="260" r="90" fill="#98CB00" opacity="0.15" filter="url(#neonGlow2)"/>

        <!-- Isometric 3D Cube / Dice -->
        <!-- Center point: (256, 260). Radius to vertices: ~120px -->
        <!-- Top Face -->
        <polygon points="256,140 360,200 256,260 152,200" fill="url(#topFaceGrad)" stroke="#3f4738" stroke-width="4"/>
        
        <!-- Left Face -->
        <polygon points="152,200 256,260 256,380 152,320" fill="url(#leftFaceGrad)" stroke="#3f4738" stroke-width="4"/>

        <!-- Right Face -->
        <polygon points="256,260 360,200 360,320 256,380" fill="url(#rightFaceGrad)" stroke="#3f4738" stroke-width="4"/>

        <!-- Cube Neon Seams -->
        <line x1="256" y1="140" x2="256" y2="260" stroke="url(#limeGrad2)" stroke-width="3" stroke-opacity="0.9"/>
        <line x1="256" y1="260" x2="360" y2="200" stroke="url(#limeGrad2)" stroke-width="3" stroke-opacity="0.9"/>
        <line x1="256" y1="260" x2="152" y2="200" stroke="url(#limeGrad2)" stroke-width="3" stroke-opacity="0.9"/>
        <line x1="256" y1="260" x2="256" y2="380" stroke="url(#limeGrad2)" stroke-width="4" filter="url(#neonGlow2)"/>

        <!-- Top Face Element: Reticle / Crosshair Pip -->
        <ellipse cx="256" cy="200" rx="36" ry="18" fill="none" stroke="url(#limeGrad2)" stroke-width="3" opacity="0.8"/>
        <circle cx="256" cy="200" r="5" fill="#C5FF00" filter="url(#neonGlow2)"/>

        <!-- Left Face Element: D-Pad in isometric perspective -->
        <g transform="translate(204, 290) skewY(30) scale(0.9, 1)">
          <rect x="-5" y="-18" width="10" height="36" rx="2" fill="#293023" stroke="#98CB00" stroke-width="1.5"/>
          <rect x="-18" y="-5" width="36" height="10" rx="2" fill="#293023" stroke="#98CB00" stroke-width="1.5"/>
        </g>

        <!-- Right Face Element: Large glowing PLAY triangle in isometric perspective -->
        <g transform="translate(308, 290) skewY(-30) scale(0.9, 1)">
          <polygon points="-12,-20 18,0 -12,20" fill="url(#limeGrad2)" filter="url(#neonGlow2)"/>
          <polygon points="-12,-20 18,0 -12,20" fill="#FFFFFF" opacity="0.4"/>
        </g>
      </svg>
    `
  },
  {
    name: 'icon_3_play_pick_monogram',
    title: 'PlayPick Geometric Monogram (PP)',
    desc: 'Премиальная киберспортивная монограмма из двух переплетённых "P" (Play & Pick) с формой кнопки Play и прицела',
    svg: `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgGrad3" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stop-color="#242920"/>
            <stop offset="70%" stop-color="#141613"/>
            <stop offset="100%" stop-color="#0a0c09"/>
          </radialGradient>
          <linearGradient id="limeGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#D4FF33"/>
            <stop offset="50%" stop-color="#98CB00"/>
            <stop offset="100%" stop-color="#739900"/>
          </linearGradient>
          <linearGradient id="metalGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#363d30"/>
            <stop offset="50%" stop-color="#23271f"/>
            <stop offset="100%" stop-color="#171914"/>
          </linearGradient>
          <filter id="neonGlow3" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="dropShadow3" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000000" flood-opacity="0.8"/>
          </filter>
        </defs>

        <!-- Squircle Base -->
        <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bgGrad3)" stroke="#32372d" stroke-width="4"/>
        <rect x="24" y="24" width="464" height="464" rx="100" fill="none" stroke="#98CB00" stroke-width="1.5" stroke-opacity="0.2"/>

        <!-- Tech Accent Grid / Angle Lines in Background -->
        <line x1="80" y1="80" x2="432" y2="432" stroke="#23281e" stroke-width="2" stroke-dasharray="8 12"/>
        <circle cx="256" cy="256" r="160" fill="none" stroke="#22271d" stroke-width="2"/>
        <circle cx="256" cy="256" r="160" fill="none" stroke="url(#limeGrad3)" stroke-width="2" stroke-dasharray="6 30" opacity="0.4"/>

        <!-- Background Glow -->
        <circle cx="270" cy="256" r="120" fill="#98CB00" opacity="0.16" filter="url(#neonGlow3)"/>

        <!-- Monogram Body with Shadow -->
        <g filter="url(#dropShadow3)">
          <!-- Primary First 'P' (Play) - Neon Lime Ribbon Forming Play Triangle -->
          <path d="
            M 148 120
            L 280 120
            C 340 120 380 160 380 215
            C 380 270 335 310 280 310
            L 216 310
            L 216 392
            L 148 392
            Z"
            fill="url(#metalGrad3)" stroke="#434c3c" stroke-width="6"/>

          <!-- Overlapping Glowing Play Chevron / Pick Triangle -->
          <path d="
            M 216 120
            L 320 120
            C 380 120 420 165 420 220
            C 420 275 375 320 315 320
            L 260 320
            L 340 220
            L 260 180
            Z"
            fill="url(#limeGrad3)" filter="url(#neonGlow3)"/>

          <!-- Dynamic Cutout & Inner Counter forming the 'P' loop / Play Arrow -->
          <polygon points="216,180 300,220 216,260" fill="#141613" stroke="#32372d" stroke-width="3"/>

          <!-- Second Accent 'P' (Pick) Stem Notch -->
          <rect x="148" y="120" width="68" height="272" rx="12" fill="url(#limeGrad3)" filter="url(#neonGlow3)"/>
          <rect x="156" y="128" width="52" height="256" rx="8" fill="#1a1e16"/>
          
          <!-- Crosshair Pick Pip inside Stem -->
          <circle cx="182" cy="190" r="8" fill="url(#limeGrad3)"/>
          <line x1="182" y1="165" x2="182" y2="215" stroke="url(#limeGrad3)" stroke-width="2.5"/>
          <line x1="157" y1="190" x2="207" y2="190" stroke="url(#limeGrad3)" stroke-width="2.5"/>

          <!-- Glowing Sharp Play Arrow in Center -->
          <polygon points="240,195 285,220 240,245" fill="#FFFFFF" filter="url(#neonGlow3)"/>
        </g>
      </svg>
    `
  },
  {
    name: 'icon_4_target_roulette_pick',
    title: 'Target Roulette & Precision Pick',
    desc: 'Круговой радар-селектор с разметкой рулетки, оптическим прицелом и неоновым маркером выбора',
    svg: `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgGrad4" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stop-color="#242820"/>
            <stop offset="70%" stop-color="#141613"/>
            <stop offset="100%" stop-color="#0a0c09"/>
          </radialGradient>
          <linearGradient id="limeGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#C5FF00"/>
            <stop offset="100%" stop-color="#98CB00"/>
          </linearGradient>
          <filter id="neonGlow4" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="9" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Squircle Base -->
        <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bgGrad4)" stroke="#32372d" stroke-width="4"/>
        <rect x="24" y="24" width="464" height="464" rx="100" fill="none" stroke="#98CB00" stroke-width="1.5" stroke-opacity="0.2"/>

        <!-- Ambient Center Glow -->
        <circle cx="256" cy="256" r="140" fill="#98CB00" opacity="0.12" filter="url(#neonGlow4)"/>

        <!-- Outer Radar Ring with Degree Ticks -->
        <circle cx="256" cy="256" r="185" fill="none" stroke="#252b20" stroke-width="6"/>
        <circle cx="256" cy="256" r="185" fill="none" stroke="url(#limeGrad4)" stroke-width="4" stroke-dasharray="4 20" opacity="0.6"/>

        <!-- Middle Roulette Chamber Track -->
        <circle cx="256" cy="256" r="150" fill="none" stroke="#1d2219" stroke-width="26"/>
        
        <!-- Roulette Chamber Slots (8 orbital nodes) -->
        <g stroke="#323a2a" stroke-width="2">
          <circle cx="256" cy="106" r="10" fill="#141613"/>
          <circle cx="362" cy="150" r="10" fill="#141613"/>
          <circle cx="406" cy="256" r="10" fill="#141613"/>
          <circle cx="362" cy="362" r="10" fill="#141613"/>
          <circle cx="256" cy="406" r="10" fill="#141613"/>
          <circle cx="150" cy="362" r="10" fill="#141613"/>
          <circle cx="106" cy="256" r="10" fill="#141613"/>
          <circle cx="150" cy="150" r="10" fill="#141613"/>
        </g>

        <!-- The "Picked" Winner Slot in Roulette Ring -->
        <circle cx="256" cy="106" r="11" fill="url(#limeGrad4)" filter="url(#neonGlow4)"/>
        <circle cx="256" cy="106" r="4" fill="#FFFFFF"/>

        <!-- Top Precision Needle Selector (The "Pick") -->
        <polygon points="256,52 240,88 272,88" fill="url(#limeGrad4)" filter="url(#neonGlow4)"/>
        <line x1="256" y1="42" x2="256" y2="88" stroke="#FFFFFF" stroke-width="2"/>

        <!-- Reticle Crosshairs with Gaps -->
        <line x1="256" y1="135" x2="256" y2="185" stroke="url(#limeGrad4)" stroke-width="3"/>
        <line x1="256" y1="327" x2="256" y2="377" stroke="url(#limeGrad4)" stroke-width="3"/>
        <line x1="135" y1="256" x2="185" y2="256" stroke="url(#limeGrad4)" stroke-width="3"/>
        <line x1="327" y1="256" x2="377" y2="256" stroke="url(#limeGrad4)" stroke-width="3"/>

        <!-- Center Hub Inner Plate -->
        <circle cx="256" cy="256" r="76" fill="#1e221b" stroke="#363e2e" stroke-width="5"/>
        <circle cx="256" cy="256" r="76" fill="none" stroke="url(#limeGrad4)" stroke-width="2" opacity="0.8"/>

        <!-- Big Center Play Icon (The "Play") -->
        <polygon points="238,212 294,256 238,300" fill="url(#limeGrad4)" filter="url(#neonGlow4)"/>
        <polygon points="238,212 294,256 238,300" fill="#FFFFFF" opacity="0.4"/>
      </svg>
    `
  },
  {
    name: 'icon_5_minimal_neon_badge',
    title: 'Minimalist Neon Esports Badge',
    desc: 'Минималистичный логотип лаунчера: гранёный щит с неоновым контуром, встроенным D-Pad и кнопкой выбора',
    svg: `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgGrad5" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stop-color="#242820"/>
            <stop offset="70%" stop-color="#141613"/>
            <stop offset="100%" stop-color="#0a0c09"/>
          </radialGradient>
          <linearGradient id="limeGrad5" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#D4FF33"/>
            <stop offset="100%" stop-color="#98CB00"/>
          </linearGradient>
          <filter id="neonGlow5" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="11" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Squircle Base -->
        <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bgGrad5)" stroke="#32372d" stroke-width="4"/>
        <rect x="24" y="24" width="464" height="464" rx="100" fill="none" stroke="#98CB00" stroke-width="1.5" stroke-opacity="0.2"/>

        <!-- Background Glow -->
        <circle cx="256" cy="256" r="130" fill="#98CB00" opacity="0.14" filter="url(#neonGlow5)"/>

        <!-- Shield Contour Outline -->
        <path d="
          M 256 86
          L 396 136
          L 370 300
          C 350 376 290 422 256 440
          C 222 422 162 376 142 300
          L 116 136
          Z"
          fill="#1b1f18" stroke="#373e30" stroke-width="7"/>

        <!-- Shield Inner Neon Border -->
        <path d="
          M 256 102
          L 380 146
          L 356 292
          C 338 360 286 402 256 418
          C 226 402 174 360 156 292
          L 132 146
          Z"
          fill="none" stroke="url(#limeGrad5)" stroke-width="3" opacity="0.7"/>

        <!-- Dynamic Diagonal Cut Line / Carbon Facet -->
        <path d="
          M 256 102
          L 380 146
          L 356 292
          C 338 360 286 402 256 418
          Z"
          fill="#FFFFFF" opacity="0.03"/>

        <!-- Central Controller Wing Profile -->
        <path d="
          M 180 200
          C 220 200 240 216 256 226
          C 272 216 292 200 332 200
          C 354 200 366 216 360 236
          L 340 304
          C 334 322 316 332 296 324
          L 274 314
          C 264 310 248 310 238 314
          L 216 324
          C 196 332 178 322 172 304
          L 152 236
          C 146 216 158 200 180 200 Z"
          fill="#242920" stroke="url(#limeGrad5)" stroke-width="4" filter="url(#neonGlow5)"/>

        <!-- Central Neon Play Triangle -->
        <polygon points="244,242 278,264 244,286" fill="url(#limeGrad5)" filter="url(#neonGlow5)"/>
        <polygon points="244,242 278,264 244,286" fill="#FFFFFF" opacity="0.5"/>

        <!-- Top Star / Pick Diamond -->
        <polygon points="256,134 266,152 256,170 246,152" fill="url(#limeGrad5)" filter="url(#neonGlow5)"/>
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

    console.log('Rendering', designs.length, 'programmatic logos to', outDir);

    for (const d of designs) {
      // 1. Save SVG
      const svgPath = path.join(outDir, `${d.name}.svg`);
      fs.writeFileSync(svgPath, d.svg.trim(), 'utf8');

      // 2. Render to PNG via Chromium offscreen
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
          ${d.svg.trim()}
        </body>
        </html>
      `;

      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      // Brief pause to allow filters & rasterizer to complete full draw
      await new Promise((r) => setTimeout(r, 250));

      const image = await win.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 });
      const pngBuffer = image.toPNG();
      const pngPath = path.join(outDir, `${d.name}.png`);
      fs.writeFileSync(pngPath, pngBuffer);

      console.log(`✓ Generated ${d.name}.png (${pngBuffer.length} bytes) & .svg`);
    }

    console.log('All programmatic icons successfully generated!');
  } catch (err) {
    console.error('Fatal error during rendering:', err);
  } finally {
    app.quit();
  }
});
