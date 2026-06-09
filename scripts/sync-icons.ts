import fs from 'fs';
import path from 'path';

const icon512Path = path.join(process.cwd(), 'public', 'icon-512.png');
const icon192Path = path.join(process.cwd(), 'public', 'icon-192.png');

function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function copyFile(src: string, dest: string) {
  if (!fileExists(src)) {
    console.error(`Source file not found: ${src}`);
    return;
  }
  try {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
    console.log(`Successfully synced icon to: ${dest}`);
  } catch (err) {
    console.error(`Failed to copy file to ${dest}:`, err);
  }
}

function runSync() {
  console.log('Starting sync of mobile launcher icons...');

  // 1. Sync iOS Icon
  const iosIconPath = path.join(
    process.cwd(),
    'ios',
    'App',
    'App',
    'Assets.xcassets',
    'AppIcon.appiconset',
    'AppIcon-512@2x.png'
  );
  if (fs.existsSync(path.dirname(iosIconPath))) {
    copyFile(icon512Path, iosIconPath);
  } else {
    console.log('iOS directory not found or does not contain AppIcon.appiconset, skipping iOS sync');
  }

  // 2. Sync Android Icons
  const mipmapDensities = ['hdpi', 'mdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
  const androidResDir = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res');

  if (fs.existsSync(androidResDir)) {
    for (const density of mipmapDensities) {
      const mipmapFolder = path.join(androidResDir, `mipmap-${density}`);
      
      // We will overwrite the main round icon, foreground icon and regular icon with our branded icon.
      copyFile(icon512Path, path.join(mipmapFolder, 'ic_launcher.png'));
      copyFile(icon512Path, path.join(mipmapFolder, 'ic_launcher_round.png'));
      copyFile(icon512Path, path.join(mipmapFolder, 'ic_launcher_foreground.png'));
    }
  } else {
    console.log('Android resource directory not found, skipping Android sync');
  }

  console.log('Mobile launcher icon sync completed successfully!');
}

runSync();
