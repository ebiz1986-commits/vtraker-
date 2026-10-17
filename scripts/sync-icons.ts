import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Generates every app icon (web PWA, Android launcher, iOS app icon) from two
 * master images so a brand change only means replacing the files in resources/:
 *   - resources/icon.png            1024x1024, opaque, used for web + legacy + iOS
 *   - resources/icon-foreground.png 1024x1024, transparent, the Android adaptive
 *                                   foreground (artwork kept within the safe zone)
 */

const root = process.cwd();
const masterPath = path.join(root, 'resources', 'icon.png');
const foregroundPath = path.join(root, 'resources', 'icon-foreground.png');

function exists(p: string): boolean {
  try { return fs.existsSync(p); } catch { return false; }
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Resize an opaque source onto a white square (for legacy/launcher/iOS icons).
async function writeOpaque(src: string, dest: string, size: number) {
  if (!exists(dest) && !fs.existsSync(path.dirname(dest))) {
    console.log(`Skipping (target dir missing): ${dest}`);
    return;
  }
  ensureDir(dest);
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(dest);
  console.log(`Wrote ${size}x${size}: ${path.relative(root, dest)}`);
}

// Resize a transparent source, keeping transparency (for the adaptive foreground).
async function writeTransparent(src: string, dest: string, size: number) {
  if (!fs.existsSync(path.dirname(dest))) {
    console.log(`Skipping (target dir missing): ${dest}`);
    return;
  }
  ensureDir(dest);
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(dest);
  console.log(`Wrote ${size}x${size} (transparent): ${path.relative(root, dest)}`);
}

async function run() {
  console.log('Generating app icons from resources/ ...');

  if (!exists(masterPath)) {
    console.error(`Master icon not found: ${masterPath} — aborting icon sync.`);
    return;
  }
  const hasForeground = exists(foregroundPath);
  if (!hasForeground) {
    console.warn(`No resources/icon-foreground.png; adaptive foreground will fall back to the opaque master.`);
  }
  const fgSource = hasForeground ? foregroundPath : masterPath;

  // 1. Web PWA icons
  await writeOpaque(masterPath, path.join(root, 'public', 'icon-192.png'), 192);
  await writeOpaque(masterPath, path.join(root, 'public', 'icon-512.png'), 512);

  // 2. iOS app icon (1024x1024, opaque — required by the App Store)
  const iosIcon = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');
  if (fs.existsSync(path.dirname(iosIcon))) {
    await writeOpaque(masterPath, iosIcon, 1024);
  } else {
    console.log('iOS AppIcon.appiconset not found, skipping iOS icon');
  }

  // 3. Android launcher icons
  const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
  if (fs.existsSync(androidRes)) {
    // Legacy square launcher icons (also used as the round variant; the system masks them)
    const legacy: Record<string, number> = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
    // Adaptive foreground sizes (108dp at each density); artwork stays in the safe zone
    const foreground: Record<string, number> = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

    for (const [density, size] of Object.entries(legacy)) {
      const folder = path.join(androidRes, `mipmap-${density}`);
      await writeOpaque(masterPath, path.join(folder, 'ic_launcher.png'), size);
      await writeOpaque(masterPath, path.join(folder, 'ic_launcher_round.png'), size);
    }
    for (const [density, size] of Object.entries(foreground)) {
      const folder = path.join(androidRes, `mipmap-${density}`);
      if (hasForeground) {
        await writeTransparent(fgSource, path.join(folder, 'ic_launcher_foreground.png'), size);
      } else {
        await writeOpaque(fgSource, path.join(folder, 'ic_launcher_foreground.png'), size);
      }
    }
  } else {
    console.log('Android resource directory not found, skipping Android icons');
  }

  console.log('App icon generation complete.');
}

run().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
