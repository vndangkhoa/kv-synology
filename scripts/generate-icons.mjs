import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd());
const publicDir = path.join(root, "public");
const iconsDir = path.join(publicDir, "icons");

await mkdir(iconsDir, { recursive: true });

const logoSvg = await readFile(path.join(publicDir, "logo.svg"));
const maskableSvg = await readFile(path.join(publicDir, "icon-maskable.svg"));

// sizes for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
for (const size of sizes) {
  const out = path.join(iconsDir, `icon-${size}x${size}.png`);
  await sharp(logoSvg).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
  console.log(`→ ${out}`);
}

// maskable 512 (full bleed)
await sharp(maskableSvg).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(iconsDir, "icon-512x512-maskable.png"));
console.log("→ icon-512x512-maskable.png");

// apple touch 180
await sharp(logoSvg).resize(180, 180).png().toFile(path.join(publicDir, "apple-touch-icon.png"));
console.log("→ apple-touch-icon.png");

// favicons
await sharp(logoSvg).resize(32, 32).png().toFile(path.join(publicDir, "favicon-32x32.png"));
await sharp(logoSvg).resize(16, 16).png().toFile(path.join(publicDir, "favicon-16x16.png"));
console.log("→ favicon-16/32");

// favicon.ico as 32x32 png renamed (browsers accept)
await copyFile(path.join(publicDir, "favicon-32x32.png"), path.join(publicDir, "favicon.ico"));
console.log("→ favicon.ico");

// 192 and 512 already done, but also copy to public root for legacy
await copyFile(path.join(iconsDir, "icon-192x192.png"), path.join(publicDir, "icon-192.png"));
await copyFile(path.join(iconsDir, "icon-512x512.png"), path.join(publicDir, "icon-512.png"));

console.log("All icons generated");
