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
const tag = 'v0.1.1-beta';
const releaseTitle = 'PlayPick 0.1.1 Beta';

const releaseBody = `## 🎮 PlayPick 0.1.1 Beta

Исправленный публичный релиз **PlayPick** — умного лаунчера и рулетки игр для Windows x64.

### 📝 Изменения в версии 0.1.1:
- **Обновление лицензии**: Переход на собственную лицензию [PlayPick Free Distribution License](LICENSE). Разрешено бесплатное личное использование и свободное некоммерческое распространение программы; запрещена продажа копий, платное распространение и взимание платы за доступ к приложению без письменного согласия правообладателя.
- **Синхронизация документации**: Приведены в полное соответствие с реальным кодом параметры длительности рулетки (по умолчанию 5 сек, ползунок 0–10 сек, ручной ввод до 60 сек), параметры таймера автозапуска (по умолчанию 5 сек, настройка 1–15 сек с кнопкой отмены), веса избранного (от -100% до +500%) и статусы поддерживаемых платформ.
- **Стабильность упаковщика**: Исправлена относительная адресация ассетов в бандле для надёжного запуска установленной версии через локальный протокол.
- **Единый фирменный стиль**: Оформление приложения и установщика Windows базируется на официальном минималистичном логотипе (монограмма «PP»).

### 🌟 Основные возможности:
- **5 режимов рулетки**: Последовательная, Случайная, Открытие кейсов, Горизонтальная рулетка, Вертикальная рулетка.
- **Гибкая система весов**: тонкая настройка влияния избранного (от -100% для исключения до +500% бонуса).
- **3 режима запуска**: Подтверждение вручную, Обратный отсчёт (с отменой), Мгновенный старт.
- **Умное добавление**: Одиночный выбор .exe с автоопределением названия и иконки, пакетное сканирование папок, нормализация путей и автослияние дубликатов.
- **Полная автономность**: Локальная база данных SQLite (%APPDATA%\\playpick\\playpick.db), отсутствие телеметрии и аналитики.

### 📥 Инструкция по установке:
1. Скачайте прикреплённый ниже файл **\`PlayPick-Setup-0.1.1.exe\`**.
2. Запустите установщик и следуйте шагам мастера Windows.
3. Откройте PlayPick, наполните библиотеку через «Поиск игр» или добавьте отдельные игры вручную.

> ℹ️ *Примечание:* Релиз версии 0.1.0 изначально публиковался под лицензией MIT. Настоящий релиз 0.1.1 и все последующие сборки распространяются на условиях PlayPick Free Distribution License.
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
      console.log('Release for ' + tag + ' does not exist yet. Creating official release...');
      const payload = JSON.stringify({
        tag_name: tag,
        target_commitish: 'main',
        name: releaseTitle,
        body: releaseBody,
        draft: false,
        prerelease: false, // Display as release, not pre-release as requested
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

    const installerPath = path.resolve(__dirname, '..', 'release', 'PlayPick Setup 0.1.1.exe');
    if (!fs.existsSync(installerPath)) {
      throw new Error('Installer not found at ' + installerPath);
    }

    // Check if asset already exists in release
    if (release.assets && release.assets.some(a => a.name === 'PlayPick-Setup-0.1.1.exe')) {
      console.log('Asset PlayPick-Setup-0.1.1.exe is already uploaded.');
    } else {
      await uploadAsset(release.upload_url, installerPath, 'PlayPick-Setup-0.1.1.exe');
    }

    console.log('\n======================================================');
    console.log('🎉 Release 0.1.1 successfully published to GitHub!');
    console.log('Release URL: https://github.com/' + owner + '/' + repo + '/releases/tag/' + tag);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Fatal error during release publishing:', err);
    process.exit(1);
  }
}

main();
