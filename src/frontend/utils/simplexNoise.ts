/**
 * Simplex Noise Implementation (Reinder Nijhoff 2020)
 * Ported for vector background generation
 */
export class SimplexNoise {
  private grad: [number, number, number][] = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
  ];
  private perm = new Uint8Array(512);
  private F2 = (Math.sqrt(3) - 1) / 2;
  private F3 = 1 / 3;
  private G2 = (3 - Math.sqrt(3)) / 6;
  private G3 = 1 / 6;

  private dot2(a: [number, number], b: [number, number]): number {
    return a[0] * b[0] + a[1] * b[1];
  }
  private sub2(a: [number, number], b: [number, number]): [number, number] {
    return [a[0] - b[0], a[1] - b[1]];
  }
  private dot3(a: [number, number, number], b: [number, number, number]): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  private sub3(a: [number, number, number], b: [number, number, number]): [number, number, number] {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  constructor(seed = 1) {
    for (let i = 0; i < 512; i++) {
      this.perm[i] = i & 255;
    }
    for (let i = 0; i < 255; i++) {
      const r = ((seed = this.hash(i + seed)) % (256 - i)) + i;
      const swp = this.perm[i];
      this.perm[i + 256] = this.perm[i] = this.perm[r];
      this.perm[r + 256] = this.perm[r] = swp;
    }
  }

  noise2D(p: [number, number] | number[]): number {
    const s = this.dot2([p[0], p[1]], [this.F2, this.F2]);
    const c: [number, number] = [Math.floor(p[0] + s), Math.floor(p[1] + s)];
    const i = c[0] & 255, j = c[1] & 255;
    const t = this.dot2(c, [this.G2, this.G2]);

    const p0 = this.sub2([p[0], p[1]], this.sub2(c, [t, t]));
    const o: [number, number] = p0[0] > p0[1] ? [1, 0] : [0, 1];
    const p1 = this.sub2(this.sub2(p0, o), [-this.G2, -this.G2]);
    const p2 = this.sub2(p0, [1 - 2 * this.G2, 1 - 2 * this.G2]);

    const g0 = this.grad[this.perm[i + this.perm[j]] % 12];
    const g1 = this.grad[this.perm[i + o[0] + this.perm[j + o[1]]] % 12];
    const g2 = this.grad[this.perm[i + 1 + this.perm[j + 1]] % 12];

    let n = Math.max(0, 0.5 - this.dot2(p0, p0)) ** 4 * this.dot2([g0[0], g0[1]], p0);
    n += Math.max(0, 0.5 - this.dot2(p1, p1)) ** 4 * this.dot2([g1[0], g1[1]], p1);
    n += Math.max(0, 0.5 - this.dot2(p2, p2)) ** 4 * this.dot2([g2[0], g2[1]], p2);

    return 70 * n;
  }

  noise3D(p: [number, number, number] | number[]): number {
    const s = this.dot3([p[0], p[1], p[2]], [this.F3, this.F3, this.F3]);
    const c: [number, number, number] = [Math.floor(p[0] + s), Math.floor(p[1] + s), Math.floor(p[2] + s)];
    const i = c[0] & 255, j = c[1] & 255, k = c[2] & 255;
    const t = this.dot3(c, [this.G3, this.G3, this.G3]);

    const p0 = this.sub3([p[0], p[1], p[2]], this.sub3(c, [t, t, t]));
    const [o0, o1]: [[number, number, number], [number, number, number]] =
      p0[0] >= p0[1]
        ? p0[1] >= p0[2]
          ? [[1, 0, 0], [1, 1, 0]]
          : p0[0] >= p0[2]
            ? [[1, 0, 0], [1, 0, 1]]
            : [[0, 0, 1], [1, 0, 1]]
        : p0[1] < p0[2]
          ? [[0, 0, 1], [0, 1, 1]]
          : p0[0] < p0[2]
            ? [[0, 1, 0], [0, 1, 1]]
            : [[0, 1, 0], [1, 1, 0]];

    const p1 = this.sub3(this.sub3(p0, o0), [-this.G3, -this.G3, -this.G3]);
    const p2 = this.sub3(this.sub3(p0, o1), [-2 * this.G3, -2 * this.G3, -2 * this.G3]);
    const p3 = this.sub3(p0, [1 - 3 * this.G3, 1 - 3 * this.G3, 1 - 3 * this.G3]);

    const g0 = this.grad[this.perm[i + this.perm[j + this.perm[k]]] % 12];
    const g1 = this.grad[this.perm[i + o0[0] + this.perm[j + o0[1] + this.perm[k + o0[2]]]] % 12];
    const g2 = this.grad[this.perm[i + o1[0] + this.perm[j + o1[1] + this.perm[k + o1[2]]]] % 12];
    const g3 = this.grad[this.perm[i + 1 + this.perm[j + 1 + this.perm[k + 1]]] % 12];

    let n = Math.max(0, 0.6 - this.dot3(p0, p0)) ** 4 * this.dot3(g0, p0);
    n += Math.max(0, 0.6 - this.dot3(p1, p1)) ** 4 * this.dot3(g1, p1);
    n += Math.max(0, 0.6 - this.dot3(p2, p2)) ** 4 * this.dot3(g2, p2);
    n += Math.max(0, 0.6 - this.dot3(p3, p3)) ** 4 * this.dot3(g3, p3);

    return 32 * n;
  }

  hash(i: number): number {
    i = 1103515245 * ((i >> 1) ^ i);
    const h32 = 1103515245 * (i ^ (i >> 3));
    return h32 ^ (h32 >> 16);
  }
}
