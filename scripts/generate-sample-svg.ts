import { SimplexNoise } from "../src/frontend/utils/simplexNoise";
import * as fs from "fs";
import * as path from "path";

function generateSvg({
  grid = 45,
  frequency = 3,
  seed = 1,
  stroke = "#38bdf8",
  strokeWidth = 0.8,
  bg = "#060810",
  size = 1000,
}) {
  const noise = new SimplexNoise(seed);
  const step = 200 / grid;
  const halfStep = 100 / grid;
  const circles: string[] = [];

  for (let i = 0; i < grid * grid; i++) {
    const x = (i % grid) * step - 100;
    const y = Math.floor(i / grid) * step - 100;

    const n = noise.noise2D([(x * frequency) / 200, (y * frequency) / 200]);
    const rRatio = Math.max(0, Math.min(1, 0.5 + 0.5 * n));
    const r = rRatio * halfStep;

    if (r > 0.1) {
      const cx = x + halfStep;
      const cy = y + halfStep;
      circles.push(
        `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" />`
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200" width="${size}" height="${size}">
  <rect x="-100" y="-100" width="200" height="200" fill="${bg}" />
  <g fill="none" stroke="${stroke}" stroke-width="${strokeWidth}">
    ${circles.join("\n    ")}
  </g>
</svg>`;
}

const svgContent = generateSvg({});
const outputPath = path.resolve(import.meta.dir, "../sample-noise-background.svg");
fs.writeFileSync(outputPath, svgContent, "utf-8");
console.log(`✅ Sample SVG background successfully written to: ${outputPath}`);
