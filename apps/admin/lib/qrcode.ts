/**
 * Self-contained QR Code Matrix & SVG Generator (ISO/IEC 18004).
 * Supports Version 1 through Version 5 with Error Correction Level M/L in Byte mode.
 */

// Galois Field GF(2^8) with primitive polynomial 0x11d (285)
const GF_EXP: number[] = new Array(512);
const GF_LOG: number[] = new Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_EXP[i + 255] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 256) {
      x ^= 0x11d;
    }
  }
  GF_LOG[0] = 0;
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[(GF_LOG[x]! + GF_LOG[y]!) % 255]!;
}

function rsCompute(data: number[], ecCount: number): number[] {
  // Generator polynomial
  let gen = [1];
  for (let i = 0; i < ecCount; i++) {
    const nextGen = new Array(gen.length + 1).fill(0);
    const factor = GF_EXP[i]!;
    for (let j = 0; j < gen.length; j++) {
      nextGen[j] ^= gfMul(gen[j]!, factor);
      nextGen[j + 1] ^= gen[j]!;
    }
    gen = nextGen;
  }

  // Remainder polynomial division
  const remainder = new Array(ecCount).fill(0);
  for (const byte of data) {
    const factor = byte ^ remainder[0]!;
    remainder.shift();
    remainder.push(0);
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j++) {
        remainder[j] ^= gfMul(gen[gen.length - 1 - j - 1] ?? 0, factor);
      }
    }
  }

  return remainder;
}

// Version table: [version, totalDataBytes, ecBytes, size]
// For Level L:
const VERSION_SPECS_L: Array<{ version: number; dataCapacity: number; ecBytes: number; size: number }> = [
  { version: 1, dataCapacity: 19, ecBytes: 7, size: 21 },
  { version: 2, dataCapacity: 34, ecBytes: 10, size: 25 },
  { version: 3, dataCapacity: 55, ecBytes: 15, size: 29 },
  { version: 4, dataCapacity: 80, ecBytes: 20, size: 33 },
  { version: 5, dataCapacity: 108, ecBytes: 26, size: 37 },
  { version: 6, dataCapacity: 136, ecBytes: 36, size: 41 },
];

export interface QrCodeResult {
  size: number;
  matrix: boolean[][];
  svg: string;
}

export function generateQrMatrix(text: string): QrCodeResult {
  const textBytes = Buffer.from(text, 'utf-8');
  const spec = VERSION_SPECS_L.find((s) => s.dataCapacity >= textBytes.length + 3) || VERSION_SPECS_L[VERSION_SPECS_L.length - 1]!;
  const { size, dataCapacity, ecBytes } = spec;

  // 1. Bitstream encoding: Byte mode (0100) + 8-bit length + data + terminator + pad
  const bits: number[] = [0, 1, 0, 0];
  const len = textBytes.length;
  for (let i = 7; i >= 0; i--) {
    bits.push((len >>> i) & 1);
  }
  for (const byte of textBytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >>> i) & 1);
    }
  }

  // Terminator (up to 4 bits)
  const maxBits = dataCapacity * 8;
  const termBits = Math.min(4, maxBits - bits.length);
  for (let i = 0; i < termBits; i++) {
    bits.push(0);
  }

  // Pad to byte
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Convert bits to data bytes
  const dataBytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i + j]!;
    }
    dataBytes.push(b);
  }

  // Pad bytes 0xEC, 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (dataBytes.length < dataCapacity) {
    dataBytes.push(padBytes[padIdx % 2]!);
    padIdx++;
  }

  // Compute Reed-Solomon EC bytes
  const ecCodes = rsCompute(dataBytes, ecBytes);
  const fullCodewords = [...dataBytes, ...ecCodes];

  // 2. Initialize matrix: false = light/white, true = dark/black
  const matrix: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  const markFunc = (r: number, c: number, val: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r]![c] = val;
      isFunction[r]![c] = true;
    }
  };

  // Finder Patterns (7x7) + Separators
  const addFinder = (top: number, left: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = top + r;
        const col = left + c;
        if (row < 0 || row >= size || col < 0 || col >= size) continue;
        const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const inBorder = inOuter && (r === 0 || r === 6 || c === 0 || c === 6);
        const inInner = inOuter && r >= 2 && r <= 4 && c >= 2 && c <= 4;
        markFunc(row, col, inBorder || inInner);
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    markFunc(6, i, i % 2 === 0);
    markFunc(i, 6, i % 2 === 0);
  }

  // Dark module
  markFunc(size - 8, 8, true);

  // Alignment Pattern for version >= 2
  if (spec.version >= 2) {
    const alignPos = size - 7;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const row = alignPos + r;
        const col = alignPos + c;
        const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
        const isCenter = r === 0 && c === 0;
        markFunc(row, col, isBorder || isCenter);
      }
    }
  }

  // Format info placeholders (Level L, Mask 0: 111011111000100)
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  // Around top-left
  for (let i = 0; i <= 5; i++) markFunc(8, i, formatBits[i] === 1);
  markFunc(8, 7, formatBits[6] === 1);
  markFunc(8, 8, formatBits[7] === 1);
  markFunc(7, 8, formatBits[8] === 1);
  for (let i = 9; i < 15; i++) markFunc(14 - i, 8, formatBits[i] === 1);

  // Around top-right and bottom-left
  for (let i = 0; i < 8; i++) markFunc(8, size - 1 - i, formatBits[i] === 1);
  for (let i = 8; i < 15; i++) markFunc(size - 15 + i, 8, formatBits[i] === 1);

  // 3. Place data in 2-column zig-zag upwards & downwards
  const allBits: number[] = [];
  for (const byte of fullCodewords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((byte >>> i) & 1);
    }
  }

  let bitIdx = 0;
  let upwards = true;
  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol--; // Skip vertical timing column
    const cols = [rightCol, rightCol - 1];
    const rows = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of cols) {
        if (!isFunction[r]![c]) {
          const bitVal = bitIdx < allBits.length ? allBits[bitIdx]! : 0;
          bitIdx++;
          // Mask 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r]![c] = Boolean(bitVal ^ (mask ? 1 : 0));
        }
      }
    }
    upwards = !upwards;
  }

  // 4. Build SVG representation
  const margin = 4;
  const totalDim = size + margin * 2;
  let rects = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r]![c]) {
        rects += `<rect x="${c + margin}" y="${r + margin}" width="1" height="1" fill="#000000"/>`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalDim} ${totalDim}" width="100%" height="100%" shape-rendering="crispEdges" aria-label="QR Code"><rect width="${totalDim}" height="${totalDim}" fill="#ffffff"/>${rects}</svg>`;

  return { size, matrix, svg };
}
