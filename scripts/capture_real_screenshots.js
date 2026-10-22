const { app, BrowserWindow, protocol, net, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// app.disableHardwareAcceleration();

const demoUserData = path.resolve(__dirname, '..', 'tmp', 'demo_userdata');
if (fs.existsSync(demoUserData)) {
  fs.rmSync(demoUserData, { recursive: true, force: true });
}
fs.mkdirSync(demoUserData, { recursive: true });
app.setPath('userData', demoUserData);

const outDir = path.resolve(__dirname, '..', 'docs', 'images');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const { initDatabase, getDb } = require('../dist-electron/electron/database/init');
const {
  addGame,
  getGames,
  getGame,
  updateGame,
  deleteGame,
  toggleInRoulette,
  toggleFavorite,
  getAllGenres,
  getAllTags,
  updateGameTags,
  batchAddGames,
  isGameDuplicate,
} = require('../dist-electron/electron/database/games');
const { getSettings, updateSettings } = require('../dist-electron/electron/database/settings');
const { getHistory, addHistoryEntry, clearHistory } = require('../dist-electron/electron/database/history');

function registerIpcHandlers() {
  ipcMain.handle('get-games', () => getGames());
  ipcMain.handle('get-game', (_e, id) => getGame(id));
  ipcMain.handle('add-game', (_e, game) => addGame(game));
  ipcMain.handle('update-game', (_e, id, updates) => updateGame(id, updates));
  ipcMain.handle('delete-game', (_e, id) => deleteGame(id));
  ipcMain.handle('toggle-in-roulette', (_e, id, val) => toggleInRoulette(id, val));
  ipcMain.handle('toggle-favorite', (_e, id, val) => toggleFavorite(id, val));
  ipcMain.handle('get-all-genres', () => getAllGenres());
  ipcMain.handle('get-all-tags', () => getAllTags());
  ipcMain.handle('update-game-tags', (_e, id, g, t) => updateGameTags(id, g, t));
  ipcMain.handle('batch-add-games', (_e, list) => batchAddGames(list));
  ipcMain.handle('check-game-duplicate', (_e, title, exe) => isGameDuplicate(title, exe));

  ipcMain.handle('get-history', () => getHistory());
  ipcMain.handle('add-history-entry', (_e, entry) => addHistoryEntry(entry));
  ipcMain.handle('clear-history', () => clearHistory());

  ipcMain.handle('get-settings', () => getSettings());
  ipcMain.handle('update-settings', (_e, updates) => updateSettings(updates));
  ipcMain.handle('get-app-version', () => '0.1.1');
  ipcMain.handle('is-first-run', () => false);
  ipcMain.handle('set-first-run-done', () => {});
  ipcMain.handle('get-covers-dir', () => path.join(demoUserData, 'covers'));

  ipcMain.handle('launch-game', async () => ({ success: true, message: 'Game launched' }));
}

function registerProtocol() {
  protocol.handle('playpick-cover', async (request) => {
    try {
      const url = new URL(request.url);
      let filePath = decodeURIComponent(url.pathname);
      if (process.platform === 'win32' && filePath.startsWith('/')) {
        filePath = filePath.slice(1);
      }
      return net.fetch(`file://${filePath}`);
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

const sampleGames = [
  {
    title: 'Cyberpunk 2077',
    launchCommand: 'C:\\Games\\Cyberpunk 2077\\bin\\x64\\Cyberpunk2077.exe',
    launchArgs: [],
    launchType: 'executable',
    genres: ['Action', 'RPG'],
    tags: ['Открытый мир', 'Киберпанк', 'Сюжет'],
    sources: [{ id: '1', gameId: '', sourceType: 'executable', sourceId: '1', sourceName: 'Executable', isInstalled: true, launchArgs: [] }],
    inRoulette: true,
    isInstalled: true,
    isFavorite: true,
    playCount: 14,
    totalPlayTime: 5200,
    userGenres: ['Action', 'RPG'],
    userTags: ['Открытый мир', 'Киберпанк', 'Сюжет'],
  },
  {
    title: 'Hades II',
    launchCommand: 'C:\\Games\\Hades II\\Hades2.exe',
    launchArgs: [],
    launchType: 'executable',
    genres: ['Action', 'Rogue-like'],
    tags: ['Инди', 'Мифология', 'Слэшер'],
    sources: [{ id: '2', gameId: '', sourceType: 'executable', sourceId: '2', sourceName: 'Executable', isInstalled: true, launchArgs: [] }],
    inRoulette: true,
    isInstalled: true,
    isFavorite: true,
    playCount: 22,
    totalPlayTime: 3600,
    userGenres: ['Action', 'Rogue-like'],
    userTags: ['Инди', 'Мифология', 'Слэшер'],
  },
  {
    title: "Baldur's Gate 3",
    launchCommand: 'C:\\Games\\Baldurs Gate 3\\bin\\bg3_dx11.exe',
    launchArgs: [],
    launchType: 'executable',
    genres: ['RPG', 'Strategy'],
    tags: ['Пошаговая', 'Фэнтези', 'Выборы'],
    sources: [{ id: '3', gameId: '', sourceType: 'executable', sourceId: '3', sourceName: 'Executable', isInstalled: true, launchArgs: [] }],
    inRoulette: true,
    isInstalled: true,
    isFavorite: true,
    playCount: 45,
    totalPlayTime: 12400,
    userGenres: ['RPG', 'Strategy'],
    userTags: ['Пошаговая', 'Фэнтези', 'Выборы'],
  },
  {
    title: 'The Witcher 3: Wild Hunt',
    launchCommand: 'C:\\Games\\The Witcher 3\\bin\\x64\\witcher3.exe',
    launchArgs: [],
    launchType: 'executable',
    genres: ['RPG', 'Action'],
    tags: ['Открытый мир', 'Фэнтези', 'Сюжет'],
    sources: [{ id: '4', gameId: '', sourceType: 'executable', sourceId: '4', sourceName: 'Executable', isInstalled: true, launchArgs: [] }],
    inRoulette: true,
    isInstalled: true,
    isFavorite: false,
    playCount: 19,
    totalPlayTime: 7800,
    userGenres: ['RPG', 'Action'],
    userTags: ['Открытый мир', 'Фэнтези', 'Сюжет'],
  },
  {
    title: 'DOOM Eternal',
    launchCommand: 'C:\\Games\\DOOM Eternal\\DoomEternal.exe',
    launchArgs: [],
    launchType: 'executable',
    genres: ['Action', 'Shooter'],
    tags: ['Шутер', 'Мясо', 'Драйв'],
    sources: [{ id: '5', gameId: '', sourceType: 'executable', sourceId: '5', sourceName: 'Executable', isInstalled: true, launchArgs: [] }],
    inRoulette: true,
    isInstalled: true,
    isFavorite: false,
    playCount: 11,
    totalPlayTime: 2400,
    userGenres: ['Action', 'Shooter'],
    userTags: ['Шутер', 'Мясо', 'Драйв'],
  },
  {
    title: 'Hollow Knight',
    launchCommand: 'C:\\Games\\Hollow Knight\\hollow_knight.exe',
    launchArgs: [],
    launchType: 'executable',
    genres: ['Metroidvania', 'Action'],
    tags: ['Исследования', 'Сложная', 'Инди'],
    sources: [{ id: '6', gameId: '', sourceType: 'executable', sourceId: '6', sourceName: 'Executable', isInstalled: true, launchArgs: [] }],
    inRoulette: true,
    isInstalled: true,
    isFavorite: false,
    playCount: 30,
    totalPlayTime: 4900,
    userGenres: ['Metroidvania', 'Action'],
    userTags: ['Исследования', 'Сложная', 'Инди'],
  },
  {
    title: 'Portal 2',
    launchCommand: 'C:\\Games\\Portal 2\\portal2.exe',
    launchArgs: [],
    launchType: 'executable',
    genres: ['Puzzle', 'Sci-Fi'],
    tags: ['Головоломка', 'Юмор', 'Классика'],
    sources: [{ id: '7', gameId: '', sourceType: 'executable', sourceId: '7', sourceName: 'Executable', isInstalled: true, launchArgs: [] }],
    inRoulette: true,
    isInstalled: true,
    isFavorite: false,
    playCount: 8,
    totalPlayTime: 1800,
    userGenres: ['Puzzle', 'Sci-Fi'],
    userTags: ['Головоломка', 'Юмор', 'Классика'],
  },
  {
    title: 'Dead Cells',
    launchCommand: 'C:\\Games\\Dead Cells\\deadcells.exe',
    launchArgs: [],
    launchType: 'executable',
    genres: ['Action', 'Rogue-like'],
    tags: ['Пиксельная', '2D', 'Платформер'],
    sources: [{ id: '8', gameId: '', sourceType: 'executable', sourceId: '8', sourceName: 'Executable', isInstalled: true, launchArgs: [] }],
    inRoulette: true,
    isInstalled: true,
    isFavorite: false,
    playCount: 16,
    totalPlayTime: 2900,
    userGenres: ['Action', 'Rogue-like'],
    userTags: ['Пиксельная', '2D', 'Платформер'],
  },
];

app.whenReady().then(async () => {
  try {
    registerProtocol();
    await initDatabase();
    registerIpcHandlers();

    for (const g of sampleGames) {
      addGame(g);
    }

    updateSettings({
      lastScanAt: new Date().toISOString(),
      soundEnabled: false,
      animationDuration: 3000,
      animationType: 'sequential',
      favoriteWeightPercent: 0,
    });

    const win = new BrowserWindow({
      width: 1240,
      height: 800,
      show: true,
      frame: false,
      backgroundColor: '#171916',
      webPreferences: {
        preload: path.resolve(__dirname, '..', 'dist-electron', 'electron', 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    const indexPath = path.resolve(__dirname, '..', 'dist', 'index.html');
    win.webContents.on('console-message', (_e, level, msg) => console.log('RENDERER:', msg));
    await win.loadFile(indexPath);
    await new Promise((r) => setTimeout(r, 1200));

    // 1. Screenshot Home Screen
    console.log('Capturing Home screen...');
    let img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, 'screenshot_home.png'), img.toPNG());
    console.log('✓ screenshot_home.png');

    // 2. Navigate to Library
    console.log('Navigating to Library...');
    await win.webContents.executeJavaScript(`(() => {
      const navButtons = document.querySelectorAll('nav button');
      for (const btn of navButtons) {
        if (btn.textContent.includes('Моя библиотека')) {
          btn.click();
          break;
        }
      }
    })()`);
    await new Promise((r) => setTimeout(r, 600));
    img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, 'screenshot_library.png'), img.toPNG());
    console.log('✓ screenshot_library.png');

    // 3. Open Add Game Modal inside Library
    console.log('Opening Add Game modal...');
    await win.webContents.executeJavaScript(`(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Добавить игру'));
      if (addBtn) addBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 600));
    img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, 'screenshot_add_game.png'), img.toPNG());
    console.log('✓ screenshot_add_game.png');

    // Close modal via Escape key
    await win.webContents.executeJavaScript(`(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    // 4. Navigate to Settings
    console.log('Navigating to Settings...');
    await win.webContents.executeJavaScript(`(() => {
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const settingsBtn = navButtons.find(b => b.textContent && b.textContent.includes('Настройки'));
      if (settingsBtn) settingsBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 700));
    img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, 'screenshot_settings.png'), img.toPNG());
    console.log('✓ screenshot_settings.png');

    // 5. Navigate back to Home and pick a game to capture ResultCard
    console.log('Navigating to Home and triggering roulette...');
    await win.webContents.executeJavaScript(`(() => {
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const homeBtn = navButtons.find(b => b.textContent && b.textContent.includes('Главная'));
      if (homeBtn) homeBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 700));

    // Click "Выбрать игру"
    await win.webContents.executeJavaScript(`(() => {
      const spinBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Выбрать игру'));
      if (spinBtn) spinBtn.click();
    })()`);

    // Wait for roulette spin animation to finish and result card to open
    console.log('Waiting for roulette result...');
    await new Promise((r) => setTimeout(r, 4500));

    img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, 'screenshot_result.png'), img.toPNG());
    console.log('✓ screenshot_result.png');

    console.log('All real application screenshots successfully captured!');
    win.close();
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    // Cleanup demo userdata
    try {
      if (fs.existsSync(demoUserData)) {
        fs.rmSync(demoUserData, { recursive: true, force: true });
      }
    } catch {}
    app.quit();
  }
});
