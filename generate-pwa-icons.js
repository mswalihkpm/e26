const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ICONS_DIR = path.join(__dirname, 'public', 'assets', 'images', 'icons');
const PUBLIC_DIR = path.join(__dirname, 'public');
const MASTER_LOGO_PATH = path.join(__dirname, 'public', 'assets', 'images', 'pwa-app-logo-master.png');

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Function to generate Windows ICO file from PNG buffers
function createIcoFromPngBuffers(pngBuffersWithSizes) {
  const count = pngBuffersWithSizes.length;
  const headerSize = 6;
  const directorySize = count * 16;
  let currentOffset = headerSize + directorySize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  const directoryEntries = [];
  const imageBuffers = [];

  for (const item of pngBuffersWithSizes) {
    const entry = Buffer.alloc(16);
    const w = item.size >= 256 ? 0 : item.size;
    const h = item.size >= 256 ? 0 : item.size;
    entry.writeUInt8(w, 0); // Width
    entry.writeUInt8(h, 1); // Height
    entry.writeUInt8(0, 2); // Color count
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // Image data size
    entry.writeUInt32LE(currentOffset, 12); // Image data offset

    directoryEntries.push(entry);
    imageBuffers.push(item.buffer);
    currentOffset += item.buffer.length;
  }

  return Buffer.concat([header, ...directoryEntries, ...imageBuffers]);
}

async function generateIcons() {
  console.log('🚀 Starting PWA & Favicon Generation with User Official Logo...');

  const masterSize = 1024;

  // 1. Read master icon buffer
  const masterBuffer = await sharp(MASTER_LOGO_PATH)
    .resize(masterSize, masterSize)
    .png()
    .toBuffer();

  // Save 1024 icon
  await sharp(masterBuffer).toFile(path.join(ICONS_DIR, 'icon-1024.png'));
  console.log('✅ Generated icon-1024.png');

  // 2. Standard sizes
  const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 384, 512];
  const icoBuffers = [];

  for (const size of sizes) {
    const resizedBuffer = await sharp(masterBuffer)
      .resize(size, size, { kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();

    if (size === 180) {
      await sharp(resizedBuffer).toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));
      await sharp(resizedBuffer).toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
      console.log('✅ Generated apple-touch-icon.png (180x180)');
    } else if (size === 16 || size === 32 || size === 48) {
      await sharp(resizedBuffer).toFile(path.join(ICONS_DIR, `favicon-${size}x${size}.png`));
      await sharp(resizedBuffer).toFile(path.join(PUBLIC_DIR, `favicon-${size}x${size}.png`));
      console.log(`✅ Generated favicon-${size}x${size}.png`);
    }

    await sharp(resizedBuffer).toFile(path.join(ICONS_DIR, `icon-${size}.png`));
    console.log(`✅ Generated icon-${size}.png (${size}x${size})`);

    if ([16, 32, 48].includes(size)) {
      icoBuffers.push({ size, buffer: resizedBuffer });
    }
  }

  // 64x64 for ICO
  const icon64 = await sharp(masterBuffer).resize(64, 64).png().toBuffer();
  icoBuffers.push({ size: 64, buffer: icon64 });

  // 3. Maskable Icons (192 & 512)
  // For maskable icons, we add safe-margin padding so Android squircle/circle masks don't clip the outer bounds
  const maskableSizes = [192, 512];
  for (const mSize of maskableSizes) {
    // Inner emblem scaled to ~82% of size on deep blue #011260 background
    const innerSize = Math.round(mSize * 0.82);
    const innerEmblem = await sharp(masterBuffer)
      .resize(innerSize, innerSize, { kernel: sharp.kernel.lanczos3 })
      .toBuffer();

    const mResized = await sharp({
      create: {
        width: mSize,
        height: mSize,
        channels: 4,
        background: { r: 1, g: 18, b: 96, alpha: 1 }
      }
    })
      .composite([
        {
          input: innerEmblem,
          top: Math.round((mSize - innerSize) / 2),
          left: Math.round((mSize - innerSize) / 2)
        }
      ])
      .png()
      .toBuffer();

    await sharp(mResized).toFile(path.join(ICONS_DIR, `icon-maskable-${mSize}.png`));
    console.log(`✅ Generated icon-maskable-${mSize}.png (${mSize}x${mSize})`);
  }

  // 4. Generate Multi-Resolution favicon.ico
  const icoData = createIcoFromPngBuffers(icoBuffers);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoData);
  fs.writeFileSync(path.join(ICONS_DIR, 'favicon.ico'), icoData);
  console.log('✅ Generated multi-resolution favicon.ico (16, 32, 48, 64 px)');

  // 5. Generate shortcut icons
  await sharp(masterBuffer).resize(192, 192).png().toFile(path.join(ICONS_DIR, 'shortcut-results.png'));
  await sharp(masterBuffer).resize(192, 192).png().toFile(path.join(ICONS_DIR, 'shortcut-leaderboard.png'));
  await sharp(masterBuffer).resize(192, 192).png().toFile(path.join(ICONS_DIR, 'shortcut-slideshow.png'));
  await sharp(masterBuffer).resize(192, 192).png().toFile(path.join(ICONS_DIR, 'shortcut-gallery.png'));
  console.log('✅ Generated shortcut icons');

  console.log('\n🎉 ALL PWA & BROWSER ICONS UPDATED WITH NEW OFFICIAL LOGO!\n');
}

generateIcons().catch(err => {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
});
