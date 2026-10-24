// Compose App Store screenshots from raw iPhone captures.
// Output: 1320x2868 (iPhone 6.9"), caption on top, screenshot inset with rounded corners.
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const CANVAS_W = 1320;
const CANVAS_H = 2868;
const BG = '#0f0f1a';
const CAPTION_AREA_H = 540;   // top area reserved for caption text
const SIDE_PADDING = 90;      // horizontal breathing room around the device
const SHOT_RADIUS = 72;       // rounded corners on the screenshot

async function makeShot({ src, maskBannerPx = 0, caption, out }) {
  // Load the capture and optionally mask the bottom banner (AdMob "Test mode" area).
  let shotBuf = await sharp(src).toBuffer();
  const srcMeta = await sharp(shotBuf).metadata();
  if (maskBannerPx > 0) {
    const bandH = Math.round(srcMeta.height * maskBannerPx);
    const band = await sharp({
      create: { width: srcMeta.width, height: bandH, channels: 4,
                background: { r: 15, g: 15, b: 26, alpha: 1 } }
    }).png().toBuffer();
    shotBuf = await sharp(shotBuf)
      .composite([{ input: band, top: srcMeta.height - bandH, left: 0 }])
      .toBuffer();
  }

  // Scale screenshot to fit canvas width minus side padding.
  const shotW = CANVAS_W - 2 * SIDE_PADDING;
  const shotH = Math.round(shotW * (srcMeta.height / srcMeta.width));
  const shotScaled = await sharp(shotBuf)
    .resize(shotW, shotH, { kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  // Rounded-corner mask (SVG).
  const roundedMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${shotW}" height="${shotH}">
      <rect width="${shotW}" height="${shotH}" rx="${SHOT_RADIUS}" ry="${SHOT_RADIUS}" fill="#fff"/>
    </svg>`
  );
  const shotRounded = await sharp(shotScaled)
    .composite([{ input: roundedMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Caption SVG (big bold centered text).
  const captionY = Math.round(CAPTION_AREA_H / 2);
  const captionSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CAPTION_AREA_H}">
      <style>
        .cap { font-family: 'Arial Black','Helvetica Neue','Segoe UI',sans-serif;
               font-weight: 900; font-size: 96px; fill: #ffffff;
               letter-spacing: -2px; }
      </style>
      <text x="${CANVAS_W/2}" y="${captionY + 44}" text-anchor="middle" class="cap">${caption}</text>
    </svg>`
  );

  // Centre screenshot vertically in the remaining area below the caption.
  const shotTop = CAPTION_AREA_H + Math.round(((CANVAS_H - CAPTION_AREA_H) - shotH) / 2);
  const shotLeft = Math.round((CANVAS_W - shotW) / 2);

  await sharp({
    create: { width: CANVAS_W, height: CANVAS_H, channels: 4,
              background: { r: 15, g: 15, b: 26, alpha: 1 } }
  })
    .composite([
      { input: captionSvg, top: 0, left: 0 },
      { input: shotRounded, top: shotTop, left: shotLeft },
    ])
    .png()
    .toFile(out);

  console.log('wrote', path.basename(out), '(from', path.basename(src) + ')');
}

const ROOT = path.resolve(__dirname, '..');
const SRC = 'C:/Users/Ultrapc/Desktop/screen';

const PLAN_EN = [
  { src: `${SRC}/IMG_1343.PNG`, caption: 'Fall. Dodge. Survive.', out: `${ROOT}/screenshots/en/01-home.png` },
  { src: `${SRC}/IMG_1340.PNG`, caption: 'Catch every gap.',       out: `${ROOT}/screenshots/en/02-midgame.png` },
  { src: `${SRC}/IMG_1339.PNG`, caption: 'Chase the Wooow!',       out: `${ROOT}/screenshots/en/03-combo.png` },
  { src: `${SRC}/IMG_1344.PNG`, caption: 'Make it yours.',         out: `${ROOT}/screenshots/en/04-shop.png` },
  { src: `${SRC}/IMG_1342.PNG`, caption: 'Beat your best.', maskBannerPx: 0.11, out: `${ROOT}/screenshots/en/05-gameover.png` },
];

const PLAN_FR = [
  { src: `${SRC}/IMG_1346.PNG`, caption: 'Chute. Esquive. Survis.', out: `${ROOT}/screenshots/fr/01-home.png` },
  { src: `${SRC}/IMG_1355.PNG`, caption: 'Vise les trous.',          out: `${ROOT}/screenshots/fr/02-midgame.png` },
  { src: `${SRC}/IMG_1352.PNG`, caption: 'Enchaîne les Wooow !',     out: `${ROOT}/screenshots/fr/03-combo.png` },
  { src: `${SRC}/IMG_1354.PNG`, caption: 'Personnalise-la.',         out: `${ROOT}/screenshots/fr/04-shop.png` },
  { src: `${SRC}/IMG_1353.PNG`, caption: 'Bats ton record.', maskBannerPx: 0.15, out: `${ROOT}/screenshots/fr/05-gameover.png` },
];

(async () => {
  for (const p of PLAN_EN) await makeShot(p);
  for (const p of PLAN_FR) await makeShot(p);
  console.log('done — 5 EN + 5 FR screenshots in', `${ROOT}/screenshots/`);
})().catch(e => { console.error(e); process.exit(1); });
