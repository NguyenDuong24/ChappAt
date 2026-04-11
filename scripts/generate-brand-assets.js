const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = process.cwd();
const assetsDir = path.join(root, 'assets', 'images');
const sourcePath = path.join(assetsDir, 'notification_icon.png');
const androidDrawableDir = path.join(root, 'android', 'app', 'src', 'main', 'res', 'drawable');

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function writePng(filePath, png) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function createCanvas(width, height, color = { r: 0, g: 0, b: 0, a: 0 }) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (width * y + x) << 2;
      png.data[idx] = color.r;
      png.data[idx + 1] = color.g;
      png.data[idx + 2] = color.b;
      png.data[idx + 3] = color.a;
    }
  }
  return png;
}

function roundedRectMask(width, height, radius) {
  const mask = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const rx = x < radius ? radius - x : x >= width - radius ? x - (width - radius - 1) : 0;
      const ry = y < radius ? radius - y : y >= height - radius ? y - (height - radius - 1) : 0;
      const inside = rx === 0 || ry === 0 || (rx * rx + ry * ry <= radius * radius);
      mask[y * width + x] = inside ? 1 : 0;
    }
  }
  return mask;
}

function createBackground(width, height, options = {}) {
  const {
    withStars = false,
    rounded = false,
  } = options;
  const png = new PNG({ width, height });
  const top = hexToRgb('#081427');
  const middle = hexToRgb('#0b1735');
  const bottom = hexToRgb('#130821');
  const cardMask = rounded ? roundedRectMask(width, height, Math.round(width * 0.12)) : null;
  const starSeed = 37;

  for (let y = 0; y < height; y += 1) {
    const vertical = y / Math.max(1, height - 1);
    const band = vertical < 0.55 ? vertical / 0.55 : (vertical - 0.55) / 0.45;
    const c1 = vertical < 0.55 ? top : middle;
    const c2 = vertical < 0.55 ? middle : bottom;
    for (let x = 0; x < width; x += 1) {
      const idx = (width * y + x) << 2;
      const horizontal = x / Math.max(1, width - 1);
      const vignetteX = (horizontal - 0.5) * 2;
      const vignetteY = (vertical - 0.5) * 2;
      const vignette = clamp(1 - Math.sqrt(vignetteX * vignetteX + vignetteY * vignetteY) * 0.34, 0.58, 1);
      const glow = Math.exp(-((vignetteX * vignetteX) / 0.22 + (vignetteY * vignetteY) / 0.28)) * 0.22;
      let r = mix(c1.r, c2.r, band);
      let g = mix(c1.g, c2.g, band);
      let b = mix(c1.b, c2.b, band);

      r = clamp(Math.round(r * vignette + 14 * glow), 0, 255);
      g = clamp(Math.round(g * vignette + 18 * glow), 0, 255);
      b = clamp(Math.round(b * vignette + 40 * glow), 0, 255);

      if (withStars) {
        const hash = Math.abs(Math.sin((x + 11) * 12.9898 + (y + starSeed) * 78.233));
        if (hash > 0.9965) {
          const strength = clamp((hash - 0.9965) * 700, 0.25, 1);
          r = clamp(r + Math.round(95 * strength), 0, 255);
          g = clamp(g + Math.round(120 * strength), 0, 255);
          b = clamp(b + Math.round(155 * strength), 0, 255);
        }
      }

      const alpha = cardMask ? Math.round(255 * cardMask[y * width + x]) : 255;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = alpha;
    }
  }

  return png;
}

function createLogoMask(source) {
  const mask = new Float32Array(source.width * source.height);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const idx = (source.width * y + x) << 2;
      const a = source.data[idx + 3] / 255;
      const brightness = (source.data[idx] + source.data[idx + 1] + source.data[idx + 2]) / (255 * 3);
      const isSparkleZone = x > source.width * 0.78 && y > source.height * 0.78;
      mask[y * source.width + x] = isSparkleZone ? 0 : clamp(brightness * a, 0, 1);
    }
  }
  return mask;
}

function resizeMask(mask, srcWidth, srcHeight, outWidth, outHeight) {
  const out = new Float32Array(outWidth * outHeight);
  for (let y = 0; y < outHeight; y += 1) {
    const sy = (y + 0.5) * srcHeight / outHeight - 0.5;
    const y0 = clamp(Math.floor(sy), 0, srcHeight - 1);
    const y1 = clamp(y0 + 1, 0, srcHeight - 1);
    const fy = sy - y0;
    for (let x = 0; x < outWidth; x += 1) {
      const sx = (x + 0.5) * srcWidth / outWidth - 0.5;
      const x0 = clamp(Math.floor(sx), 0, srcWidth - 1);
      const x1 = clamp(x0 + 1, 0, srcWidth - 1);
      const fx = sx - x0;
      const a = mask[y0 * srcWidth + x0];
      const b = mask[y0 * srcWidth + x1];
      const c = mask[y1 * srcWidth + x0];
      const d = mask[y1 * srcWidth + x1];
      const top = a + (b - a) * fx;
      const bottom = c + (d - c) * fx;
      out[y * outWidth + x] = clamp(top + (bottom - top) * fy, 0, 1);
    }
  }
  return out;
}

function fillLogo(width, height, alphaMask, transparentBackground = false) {
  const png = transparentBackground
    ? createCanvas(width, height)
    : createBackground(width, height, { rounded: false, withStars: false });
  const cStart = hexToRgb('#1DE6F7');
  const cMid = hexToRgb('#5E8BFF');
  const cEnd = hexToRgb('#F62DB6');

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = alphaMask[y * width + x];
      if (alpha <= 0.01) continue;
      const idx = (width * y + x) << 2;
      const t = clamp((x / width) * 0.74 + (1 - y / height) * 0.26, 0, 1);
      const first = t < 0.55 ? t / 0.55 : 1;
      const second = t < 0.55 ? 0 : (t - 0.55) / 0.45;
      const r = t < 0.55 ? mix(cStart.r, cMid.r, first) : mix(cMid.r, cEnd.r, second);
      const g = t < 0.55 ? mix(cStart.g, cMid.g, first) : mix(cMid.g, cEnd.g, second);
      const b = t < 0.55 ? mix(cStart.b, cMid.b, first) : mix(cMid.b, cEnd.b, second);

      if (transparentBackground) {
        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = Math.round(255 * alpha);
      } else {
        const baseA = png.data[idx + 3] / 255;
        const blend = alpha * 0.98;
        png.data[idx] = Math.round(png.data[idx] * (1 - blend) + r * blend);
        png.data[idx + 1] = Math.round(png.data[idx + 1] * (1 - blend) + g * blend);
        png.data[idx + 2] = Math.round(png.data[idx + 2] * (1 - blend) + b * blend);
        png.data[idx + 3] = Math.round(255 * Math.max(baseA, blend));
      }
    }
  }

  return png;
}

function drawGlow(png, mask, colorHex, strength) {
  const color = hexToRgb(colorHex);
  for (let y = 1; y < png.height - 1; y += 1) {
    for (let x = 1; x < png.width - 1; x += 1) {
      const idx = (png.width * y + x) << 2;
      const value = mask[y * png.width + x];
      if (value < 0.02) continue;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const nIdx = (png.width * (y + oy) + (x + ox)) << 2;
          const halo = value * strength * (ox === 0 && oy === 0 ? 0.2 : 0.08);
          png.data[nIdx] = clamp(png.data[nIdx] + Math.round(color.r * halo), 0, 255);
          png.data[nIdx + 1] = clamp(png.data[nIdx + 1] + Math.round(color.g * halo), 0, 255);
          png.data[nIdx + 2] = clamp(png.data[nIdx + 2] + Math.round(color.b * halo), 0, 255);
          png.data[nIdx + 3] = clamp(png.data[nIdx + 3] + Math.round(255 * halo * 0.55), 0, 255);
        }
      }
    }
  }
}

function composite(dest, src, offsetX, offsetY) {
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      const dx = x + offsetX;
      const dy = y + offsetY;
      if (dx < 0 || dy < 0 || dx >= dest.width || dy >= dest.height) continue;
      const sIdx = (src.width * y + x) << 2;
      const dIdx = (dest.width * dy + dx) << 2;
      const sa = src.data[sIdx + 3] / 255;
      const da = dest.data[dIdx + 3] / 255;
      const outA = sa + da * (1 - sa);
      if (outA <= 0) continue;
      dest.data[dIdx] = Math.round((src.data[sIdx] * sa + dest.data[dIdx] * da * (1 - sa)) / outA);
      dest.data[dIdx + 1] = Math.round((src.data[sIdx + 1] * sa + dest.data[dIdx + 1] * da * (1 - sa)) / outA);
      dest.data[dIdx + 2] = Math.round((src.data[sIdx + 2] * sa + dest.data[dIdx + 2] * da * (1 - sa)) / outA);
      dest.data[dIdx + 3] = Math.round(outA * 255);
    }
  }
}

function makeNotificationIcon(mask) {
  const size = 96;
  const alpha = resizeMask(mask, 768, 768, size, size);
  const out = createCanvas(size, size);
  for (let i = 0; i < size * size; i += 1) {
    const idx = i << 2;
    const a = Math.round(alpha[i] * 255);
    out.data[idx] = 255;
    out.data[idx + 1] = 255;
    out.data[idx + 2] = 255;
    out.data[idx + 3] = a;
  }
  return out;
}

function makeIconSet(mask) {
  const master = resizeMask(mask, 768, 768, 760, 760);

  const icon = createBackground(1024, 1024, { rounded: true, withStars: true });
  const iconLogo = fillLogo(760, 760, master, true);
  drawGlow(iconLogo, master, '#3D8BFF', 0.55);
  composite(icon, iconLogo, 132, 106);

  const splashIcon = createCanvas(1024, 1024);
  const splashLogoMask = resizeMask(mask, 768, 768, 880, 880);
  const splashLogo = fillLogo(880, 880, splashLogoMask, true);
  drawGlow(splashLogo, splashLogoMask, '#29D7FF', 0.65);
  composite(splashIcon, splashLogo, 72, 72);

  const adaptiveIcon = createCanvas(1024, 1024);
  const adaptiveMask = resizeMask(mask, 768, 768, 820, 820);
  const adaptiveLogo = fillLogo(820, 820, adaptiveMask, true);
  composite(adaptiveIcon, adaptiveLogo, 102, 102);

  const favicon = createBackground(48, 48, { rounded: true, withStars: false });
  const faviconMask = resizeMask(mask, 768, 768, 34, 34);
  const faviconLogo = fillLogo(34, 34, faviconMask, true);
  composite(favicon, faviconLogo, 7, 6);

  const splash = createBackground(1284, 2778, { rounded: false, withStars: true });
  const splashMask = resizeMask(mask, 768, 768, 700, 700);
  const splashMark = fillLogo(700, 700, splashMask, true);
  drawGlow(splashMark, splashMask, '#4B83FF', 0.8);
  composite(splash, splashMark, 292, 760);

  return { icon, splashIcon, adaptiveIcon, favicon, splash };
}

function main() {
  const source = readPng(sourcePath);
  const sourceMask = createLogoMask(source);
  const croppedMask = resizeMask(sourceMask, source.width, source.height, 768, 768);
  const { icon, splashIcon, adaptiveIcon, favicon, splash } = makeIconSet(croppedMask);
  const notification = makeNotificationIcon(croppedMask);

  writePng(path.join(assetsDir, 'icon.png'), icon);
  writePng(path.join(assetsDir, 'splash-icon.png'), splashIcon);
  writePng(path.join(assetsDir, 'adaptive-icon.png'), adaptiveIcon);
  writePng(path.join(assetsDir, 'favicon.png'), favicon);
  writePng(path.join(assetsDir, 'splash.png'), splash);
  writePng(path.join(assetsDir, 'notification_icon.png'), notification);
  writePng(path.join(androidDrawableDir, 'notification_icon.png'), notification);

  console.log('Brand assets generated successfully.');
}

main();
