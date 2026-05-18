import sharp from "sharp";
import { mkdirSync } from "fs";
import { join } from "path";

const outDir = join(process.cwd(), "public", "icons");
mkdirSync(outDir, { recursive: true });

const svg = (size: number) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#60a5fa"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="#000"/>
  <text x="50%" y="56%" font-family="Helvetica, Arial, sans-serif" font-size="240" font-weight="700"
        text-anchor="middle" fill="url(#g)" letter-spacing="-12">FW</text>
</svg>
`;

async function run() {
  for (const size of [192, 512]) {
    const buf = Buffer.from(svg(size));
    await sharp(buf).resize(size, size).png().toFile(join(outDir, `icon-${size}.png`));
    console.log(`wrote icon-${size}.png`);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
