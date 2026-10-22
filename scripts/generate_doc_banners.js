const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.disableHardwareAcceleration();

const outDir = path.resolve(__dirname, '..', 'docs', 'images');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const banners = [
  {
    filename: 'hero_banner.png',
    width: 960,
    height: 280,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body {
            width:960px; height:280px; background:#141613; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            display:flex; align-items:center; justify-content:space-between; padding:32px 48px; border-radius:16px; border:2px solid #30342C; overflow:hidden; position:relative;
          }
          .bg-glow {
            position:absolute; width:450px; height:450px; background:radial-gradient(circle, rgba(152,203,0,0.12) 0%, rgba(20,22,19,0) 70%); top:-85px; right:60px; pointer-events:none;
          }
          .grid {
            position:absolute; inset:0; background-image:linear-gradient(to right, #1d211a 1px, transparent 1px), linear-gradient(to bottom, #1d211a 1px, transparent 1px); background-size:32px 32px; opacity:0.4; pointer-events:none;
          }
          .content { position:relative; z-index:2; max-width:580px; }
          .badge-row { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
          .badge { background:rgba(152,203,0,0.15); border:1px solid #98CB00; color:#98CB00; font-size:12px; font-weight:700; padding:3px 10px; border-radius:6px; letter-spacing:0.08em; text-transform:uppercase; }
          .platform { color:#92968C; font-size:13px; font-weight:500; }
          h1 { color:#E8EBE4; font-size:42px; font-weight:800; letter-spacing:-0.5px; line-height:1.1; margin-bottom:8px; }
          h1 span { color:#98CB00; }
          p { color:#92968C; font-size:17px; line-height:1.4; font-weight:400; }
          .logo-wrapper { position:relative; z-index:2; width:160px; height:160px; filter:drop-shadow(0 12px 24px rgba(0,0,0,0.6)); }
          .logo-img { width:100%; height:100%; }
        </style>
      </head>
      <body>
        <div class="grid"></div>
        <div class="bg-glow"></div>
        <div class="content">
          <div class="badge-row">
            <span class="badge">0.1.1 Beta</span>
            <span class="platform">Windows x64 • Electron • SQLite</span>
          </div>
          <h1>Play<span>Pick</span></h1>
          <p>Умный лаунчер и рулетка игр. Меньше времени на выбор — больше удовольствия от игры.</p>
        </div>
        <div class="logo-wrapper">
          <img class="logo-img" src="../../assets/icon.png" />
        </div>
      </body>
      </html>
    `
  },
  {
    filename: 'header_overview.png',
    width: 900,
    height: 100,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body {
            width:900px; height:100px; background:#181A16; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display:flex; align-items:center; justify-content:space-between; padding:0 36px; border-radius:12px; border:1px solid #30342C; position:relative; overflow:hidden;
          }
          .accent-bar { position:absolute; left:0; top:0; bottom:0; width:6px; background:#98CB00; }
          .title-group { display:flex; flex-direction:column; gap:2px; }
          .sub { color:#98CB00; font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; }
          h2 { color:#E8EBE4; font-size:24px; font-weight:700; letter-spacing:-0.2px; }
          .icon-decor { color:#30342C; font-size:28px; font-weight:800; font-family:monospace; }
        </style>
      </head>
      <body>
        <div class="accent-bar"></div>
        <div class="title-group">
          <span class="sub">PlayPick Docs</span>
          <h2>01. О программе / Overview</h2>
        </div>
        <div class="icon-decor">▲ PP-01</div>
      </body>
      </html>
    `
  },
  {
    filename: 'header_features.png',
    width: 900,
    height: 100,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body {
            width:900px; height:100px; background:#181A16; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display:flex; align-items:center; justify-content:space-between; padding:0 36px; border-radius:12px; border:1px solid #30342C; position:relative; overflow:hidden;
          }
          .accent-bar { position:absolute; left:0; top:0; bottom:0; width:6px; background:#98CB00; }
          .title-group { display:flex; flex-direction:column; gap:2px; }
          .sub { color:#98CB00; font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; }
          h2 { color:#E8EBE4; font-size:24px; font-weight:700; letter-spacing:-0.2px; }
          .icon-decor { color:#30342C; font-size:28px; font-weight:800; font-family:monospace; }
        </style>
      </head>
      <body>
        <div class="accent-bar"></div>
        <div class="title-group">
          <span class="sub">Core Capabilities</span>
          <h2>02. Возможности / Features</h2>
        </div>
        <div class="icon-decor">▲ PP-02</div>
      </body>
      </html>
    `
  },
  {
    filename: 'header_settings.png',
    width: 900,
    height: 100,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body {
            width:900px; height:100px; background:#181A16; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display:flex; align-items:center; justify-content:space-between; padding:0 36px; border-radius:12px; border:1px solid #30342C; position:relative; overflow:hidden;
          }
          .accent-bar { position:absolute; left:0; top:0; bottom:0; width:6px; background:#98CB00; }
          .title-group { display:flex; flex-direction:column; gap:2px; }
          .sub { color:#98CB00; font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; }
          h2 { color:#E8EBE4; font-size:24px; font-weight:700; letter-spacing:-0.2px; }
          .icon-decor { color:#30342C; font-size:28px; font-weight:800; font-family:monospace; }
        </style>
      </head>
      <body>
        <div class="accent-bar"></div>
        <div class="title-group">
          <span class="sub">Customization & Rules</span>
          <h2>03. Настройки / Settings</h2>
        </div>
        <div class="icon-decor">▲ PP-03</div>
      </body>
      </html>
    `
  },
  {
    filename: 'header_installation.png',
    width: 900,
    height: 100,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body {
            width:900px; height:100px; background:#181A16; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display:flex; align-items:center; justify-content:space-between; padding:0 36px; border-radius:12px; border:1px solid #30342C; position:relative; overflow:hidden;
          }
          .accent-bar { position:absolute; left:0; top:0; bottom:0; width:6px; background:#98CB00; }
          .title-group { display:flex; flex-direction:column; gap:2px; }
          .sub { color:#98CB00; font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; }
          h2 { color:#E8EBE4; font-size:24px; font-weight:700; letter-spacing:-0.2px; }
          .icon-decor { color:#30342C; font-size:28px; font-weight:800; font-family:monospace; }
        </style>
      </head>
      <body>
        <div class="accent-bar"></div>
        <div class="title-group">
          <span class="sub">Get Started</span>
          <h2>04. Установка и сборка / Installation</h2>
        </div>
        <div class="icon-decor">▲ PP-04</div>
      </body>
      </html>
    `
  }
];

app.whenReady().then(async () => {
  try {
    for (const b of banners) {
      const win = new BrowserWindow({
        width: b.width,
        height: b.height,
        show: false,
        frame: false,
        transparent: true,
        webPreferences: { offscreen: true },
      });

      const tempHtmlPath = path.join(outDir, `_temp_${b.filename}.html`);
      fs.writeFileSync(tempHtmlPath, b.html.trim(), 'utf8');

      await win.loadFile(tempHtmlPath);
      await new Promise((r) => setTimeout(r, 200));

      const img = await win.webContents.capturePage({ x: 0, y: 0, width: b.width, height: b.height });
      const pngPath = path.join(outDir, b.filename);
      fs.writeFileSync(pngPath, img.toPNG());
      console.log(`Generated banner: ${b.filename} (${img.toPNG().length} bytes)`);

      fs.unlinkSync(tempHtmlPath);
      win.close();
    }
  } catch (err) {
    console.error('Error generating banners:', err);
  } finally {
    app.quit();
  }
});
