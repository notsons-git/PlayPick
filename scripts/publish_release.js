const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. Get credentials from git credential-manager
function getGithubToken() {
  try {
    const output = execSync('echo protocol=https`nhost=github.com | git credential-manager get', {
      encoding: 'utf8',
      shell: 'powershell.exe',
    });
    for (const line of output.split(/\r?\n/)) {
      if (line.startsWith('password=')) {
        return line.substring('password='.length).trim();
      }
    }
  } catch (err) {
    console.error('Failed to get token from git credential-manager:', err.message);
  }
  return process.env.GITHUB_TOKEN || '';
}

const token = getGithubToken();
if (!token) {
  console.error('FATAL: Could not retrieve GitHub token.');
  process.exit(1);
}

const owner = 'notsons-git';
const repo = 'PlayPick';
const tag = 'v0.1.0-beta';
const releaseTitle = 'PlayPick 0.1.0 Beta';

const releaseBody = `## 🎮 PlayPick 0.1.0 Beta

Первая публичная бета-версия **PlayPick** — умного лаунчера и рулетки игр для Windows x64.

### 🌟 Что умеет PlayPick:
- **5 режимов рулетки**: Последовательная, Случайная, Открытие кейсов, Горизонтальное колесо, Вертикальное колесо.
- **Интеллектуальные шансы**: регулируемый приоритет для избранных игр (до +500%).
- **3 режима автозапуска**: Подтверждение кнопкой, 3-секундный таймер с отменой, Мгновенный запуск.
- **Умная нормализация .exe и защита от дубликатов**: объединение статистики, истории и тегов.
- **Многоуровневые фильтры**: фильтрация по жанрам, тегам («Любой» / «Все») и исключение недавних игр.
- **Автономная локальная база данных**: быстрое и надёжное хранилище SQLite без обязательных аккаунтов.

### 📥 Инструкция по установке:
1. Скачайте прикреплённый ниже файл **\`PlayPick-Setup-0.1.0.exe\`**.
2. Запустите файл установщика и следуйте подсказкам мастера Windows.
3. Откройте приложение, добавьте свои игры через вкладку «Моя библиотека» или воспользуйтесь «Поиском игр».

> ⚠️ **Обратите внимание**: это первая Beta-версия. Если вы столкнулись с ошибкой или хотите предложить новую функцию — создайте [GitHub Issue](https://github.com/notsons-git/PlayPick/issues).
`;

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error('HTTP ' + res.statusCode + ': ' + JSON.stringify(parsed)));
          }
        } catch {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error('HTTP ' + res.statusCode + ': ' + body));
          }
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function uploadAsset(uploadUrl, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const cleanUrl = uploadUrl.replace(/\{.*?\}$/, '') + '?name=' + encodeURIComponent(fileName);
    const urlObj = new URL(cleanUrl);
    const stats = fs.statSync(filePath);

    console.log('Uploading ' + fileName + ' (' + (stats.size / 1024 / 1024).toFixed(1) + ' MB) to ' + urlObj.hostname + '...');

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'User-Agent': 'PlayPick-Release-Script',
        'Content-Type': 'application/octet-stream',
        'Content-Length': stats.size,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✓ Successfully uploaded ' + fileName + '!');
          resolve(body);
        } else {
          reject(new Error('Upload failed HTTP ' + res.statusCode + ': ' + body));
        }
      });
    });

    req.on('error', reject);

    const stream = fs.createReadStream(filePath);
    stream.pipe(req);
  });
}

async function main() {
  try {
    console.log('Checking existing releases for ' + owner + '/' + repo + '...');
    let release;

    try {
      release = await request({
        hostname: 'api.github.com',
        path: '/repos/' + owner + '/' + repo + '/releases/tags/' + tag,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token,
          'User-Agent': 'PlayPick-Release-Script',
          Accept: 'application/vnd.github.v3+json',
        },
      });
      console.log('Found existing release (ID: ' + release.id + ')');
    } catch {
      console.log('Release for ' + tag + ' does not exist yet. Creating release...');
      const payload = JSON.stringify({
        tag_name: tag,
        target_commitish: 'main',
        name: releaseTitle,
        body: releaseBody,
        draft: false,
        prerelease: true,
      });

      release = await request(
        {
          hostname: 'api.github.com',
          path: '/repos/' + owner + '/' + repo + '/releases',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'User-Agent': 'PlayPick-Release-Script',
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
        },
        payload
      );
      console.log('✓ Created release "' + release.name + '" (ID: ' + release.id + ')');
    }

    const installerPath = path.resolve(__dirname, '..', 'release', 'PlayPick Setup 0.1.0.exe');
    if (!fs.existsSync(installerPath)) {
      throw new Error('Installer not found at ' + installerPath);
    }

    // Check if asset already exists in release
    if (release.assets && release.assets.some(a => a.name === 'PlayPick-Setup-0.1.0.exe')) {
      console.log('Asset PlayPick-Setup-0.1.0.exe is already uploaded.');
    } else {
      await uploadAsset(release.upload_url, installerPath, 'PlayPick-Setup-0.1.0.exe');
    }

    console.log('\n======================================================');
    console.log('🎉 Beta Release 0.1.0 successfully published to GitHub!');
    console.log('Release URL: https://github.com/' + owner + '/' + repo + '/releases/tag/' + tag);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Fatal error during release publishing:', err);
    process.exit(1);
  }
}

main();
