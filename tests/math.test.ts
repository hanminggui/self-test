import { describe, test, expect } from "bun:test";
import { normCdf, normPdf, normPpf, nelderMead, compute4AFCdPrime } from "../src/backend/math";

describe("Math and Numerical Accuracy", () => {
  test("normCdf and normPpf are mutual inverses", () => {
    const testPoints = [0.01, 0.1, 0.25, 0.5, 0.7071, 0.85, 0.95, 0.99];
    for (const p of testPoints) {
      const z = normPpf(p);
      const reconstructedP = normCdf(z);
      expect(Math.abs(reconstructedP - p)).toBeLessThan(1e-6);
    }
  });

  test("normPpf matches standard statistical values", () => {
    expect(Math.abs(normPpf(0.5) - 0.0)).toBeLessThan(1e-7);
    expect(Math.abs(normPpf(0.8413447) - 1.0)).toBeLessThan(1e-4);
    expect(Math.abs(normPpf(0.9772498) - 2.0)).toBeLessThan(1e-4);
    expect(Math.abs(normPpf(0.7071) - 0.5449)).toBeLessThan(1e-3);
  });

  test("Nelder-Mead minimizes quadratic function", () => {
    // f(x, y) = (x - 3)^2 + (y + 2)^2 + 5
    const f = (pt: number[]) => Math.pow(pt[0] - 3, 2) + Math.pow(pt[1] + 2, 2) + 5;
    const res = nelderMead(f, [0, 0]);
    expect(Math.abs(res.point[0] - 3)).toBeLessThan(1e-3);
    expect(Math.abs(res.point[1] - (-2))).toBeLessThan(1e-3);
    expect(Math.abs(res.value - 5)).toBeLessThan(1e-3);
  });

  test("4AFC d' returns reasonable values", () => {
    const dPrime = compute4AFCdPrime(0.7071);
    expect(dPrime).toBeGreaterThan(0.7);
    expect(dPrime).toBeLessThan(1.8);
  });
});
