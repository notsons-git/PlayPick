const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  try {
    const srcPngPath = path.resolve(__dirname, '..', 'icons', 'pp_nested_4_pure_geometric.png');
    if (!fs.existsSync(srcPngPath)) {
      throw new Error('Source logo file does not exist: ' + srcPngPath);
    }

    const baseImg = nativeImage.createFromPath(srcPngPath);
    console.log('Loaded base logo:', baseImg.getSize());

    // Target sizes for Windows ICO
    const sizes = [256, 128, 64, 48, 32, 16];
    const pngEntries = [];

    for (const size of sizes) {
      const resized = baseImg.resize({ width: size, height: size, quality: 'high' });
      const pngBuffer = resized.toPNG();
      pngEntries.push({
        size,
        buffer: pngBuffer,
      });
      console.log(`Prepared ${size}x${size} PNG: ${pngBuffer.length} bytes`);
    }

    // Build standard ICO format containing PNG streams
    // ICONDIR: 6 bytes
    // Reserved (2), Type (2, 1=icon), Count (2)
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // type = icon
    header.writeUInt16LE(pngEntries.length, 4); // count

    let offset = 6 + (16 * pngEntries.length);
    const directoryEntries = [];
    const imageBuffers = [];

    for (const entry of pngEntries) {
      const dirEntry = Buffer.alloc(16);
      const w = entry.size >= 256 ? 0 : entry.size;
      const h = entry.size >= 256 ? 0 : entry.size;

      dirEntry.writeUInt8(w, 0);
      dirEntry.writeUInt8(h, 1);
      dirEntry.writeUInt8(0, 2); // color count
      dirEntry.writeUInt8(0, 3); // reserved
      dirEntry.writeUInt16LE(1, 4); // color planes
      dirEntry.writeUInt16LE(32, 6); // bits per pixel
      dirEntry.writeUInt32LE(entry.buffer.length, 8); // size
      dirEntry.writeUInt32LE(offset, 12); // offset

      directoryEntries.push(dirEntry);
      imageBuffers.push(entry.buffer);

      offset += entry.buffer.length;
    }

    const finalIcoBuffer = Buffer.concat([
      header,
      ...directoryEntries,
      ...imageBuffers,
    ]);

    const assetsDir = path.resolve(__dirname, '..', 'assets');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

    const icoPath = path.join(assetsDir, 'icon.ico');
    fs.writeFileSync(icoPath, finalIcoBuffer);
    console.log(`SUCCESS: Created multi-resolution ICO at ${icoPath} (${finalIcoBuffer.length} bytes)`);

    // Also update assets/icon.png (512x512) and 256x256
    const icon512Png = baseImg.toPNG();
    fs.writeFileSync(path.join(assetsDir, 'icon.png'), icon512Png);
    console.log(`SUCCESS: Updated assets/icon.png (${icon512Png.length} bytes)`);
  } catch (err) {
    console.error('Failed to create icon:', err);
  } finally {
    app.quit();
  }
});
