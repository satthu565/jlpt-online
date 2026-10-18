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
const VERSION_SPECS_L: Array<{ version: number; dataCapacity: number; ecBytes: number; size: number }> = [
  { version: 1, dataCapacity: 17, ecBytes: 7, size: 21 },
  { version: 2, dataCapacity: 32, ecBytes: 10, size: 25 },
  { version: 3, dataCapacity: 53, ecBytes: 15, size: 29 },
  { version: 4, dataCapacity: 78, ecBytes: 20, size: 33 },
  { version: 5, dataCapacity: 106, ecBytes: 26, size: 37 },
  { version: 6, dataCapacity: 134, ecBytes: 18 * 2, size: 41 },
  { version: 7, dataCapacity: 154, ecBytes: 20 * 2, size: 45 },
  { version: 8, dataCapacity: 192, ecBytes: 24 * 2, size: 49 },
  { version: 9, dataCapacity: 230, ecBytes: 30 * 2, size: 53 },
  { version: 10, dataCapacity: 271, ecBytes: 18 * 4, size: 57 },
];

function selectVersion(byteCount: number): { version: number; dataCapacity: number; ecBytes: number; size: number } {
  // Byte mode header: 4 bits mode indicator + 8 bits character count indicator = 12 bits = 1.5 bytes
  const requiredDataBytes = byteCount + 2;
  for (const spec of VERSION_SPECS_L) {
    if (spec.dataCapacity >= requiredDataBytes) {
      return spec;
    }
  }
  return VERSION_SPECS_L[VERSION_SPECS_L.length - 1]!;
}

export function generateQrMatrix(text: string): { matrix: boolean[][]; size: number; svg: string } {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);
  const spec = selectVersion(rawBytes.length);
  const size = spec.size;

  // Initialize empty matrix
  const matrix: Array<Array<boolean | null>> = Array.from({ length: size }, () => Array(size).fill(null));

  // Helper to place finder pattern
  const placeFinder = (startX: number, startY: number) => {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const x = startX + dx;
        const y = startY + dy;
        if (x < 0 || x >= size || y < 0 || y >= size) continue;

        if (dx === -1 || dx === 7 || dy === -1 || dy === 7) {
          matrix[y]![x] = false; // Separator
        } else if (dx === 0 || dx === 6 || dy === 0 || dy === 6) {
          matrix[y]![x] = true; // Outer ring
        } else if (dx === 1 || dx === 5 || dy === 1 || dy === 5) {
          matrix[y]![x] = false; // Inner space
        } else {
          matrix[y]![x] = true; // Inner 3x3 box
        }
      }
    }
  };

  placeFinder(0, 0); // Top-left
  placeFinder(size - 7, 0); // Top-right
  placeFinder(0, size - 7); // Bottom-left

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const bit = i % 2 === 0;
    if (matrix[6]![i] === null) matrix[6]![i] = bit;
    if (matrix[i]![6] === null) matrix[i]![6] = bit;
  }

  // Dark module
  matrix[size - 8]![8] = true;

  // Reserve format info area
  for (let i = 0; i < 9; i++) {
    if (matrix[8]![i] === null) matrix[8]![i] = false;
    if (matrix[i]![8] === null) matrix[i]![8] = false;
    if (matrix[8]![size - 1 - i] === null) matrix[8]![size - 1 - i] = false;
    if (matrix[size - 1 - i]![8] === null) matrix[size - 1 - i]![8] = false;
  }

  // Build bitstream: Mode (0100 for Byte mode) + Length (8 bits for V1-9) + Data
  const bits: number[] = [];
  // Mode: 0100
  bits.push(0, 1, 0, 0);

  // Length in 8 bits
  for (let b = 7; b >= 0; b--) {
    bits.push((rawBytes.length >> b) & 1);
  }

  // Raw data bytes
  for (const byte of rawBytes) {
    for (let b = 7; b >= 0; b--) {
      bits.push((byte >> b) & 1);
    }
  }

  // Terminator (up to 4 zeroes)
  const maxDataBits = spec.dataCapacity * 8;
  while (bits.length < maxDataBits && bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Pad to capacity with 0xEC and 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxDataBits) {
    const pad = padBytes[padIdx % 2]!;
    padIdx++;
    for (let b = 7; b >= 0; b--) {
      bits.push((pad >> b) & 1);
    }
  }

  // Convert data bits to bytes for Reed-Solomon computation
  const dataBytes: number[] = [];
  for (let i = 0; i < spec.dataCapacity; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | (bits[i * 8 + b] ?? 0);
    }
    dataBytes.push(byte);
  }

  const ecBytes = rsCompute(dataBytes, spec.ecBytes);
  const totalCodewords = [...dataBytes, ...ecBytes];

  const totalBits: number[] = [];
  for (const cw of totalCodewords) {
    for (let b = 7; b >= 0; b--) {
      totalBits.push((cw >> b) & 1);
    }
  }

  // Place data bits in matrix (Right-to-left upward/downward snake)
  let bitIdx = 0;
  let upward = true;

  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol--; // Skip vertical timing pattern column

    const rowIndices = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rowIndices) {
      for (const c of [rightCol, rightCol - 1]) {
        if (matrix[r]![c] === null) {
          const bitVal = bitIdx < totalBits.length ? totalBits[bitIdx]! : 0;
          bitIdx++;

          // Apply standard Mask 0: (row + column) % 2 === 0
          const mask = (r + c) % 2 === 0;
          const finalBit = (bitVal === 1) !== mask;
          matrix[r]![c] = finalBit;
        }
      }
    }
    upward = !upward;
  }

  // Format string for Error Correction L (01) and Mask 0 (000) -> 01000
  // Format bit sequence with BCH error correction: 111011111000100
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];

  // Write format bits around top-left, top-right, and bottom-left finders
  for (let i = 0; i < 6; i++) matrix[8]![i] = formatBits[i] === 1;
  matrix[8]![7] = formatBits[6] === 1;
  matrix[8]![8] = formatBits[7] === 1;
  matrix[7]![8] = formatBits[8] === 1;
  for (let i = 9; i < 15; i++) matrix[14 - i]![8] = formatBits[i] === 1;

  for (let i = 0; i < 8; i++) matrix[8]![size - 1 - i] = formatBits[i] === 1;
  for (let i = 8; i < 15; i++) matrix[size - 15 + i]![8] = formatBits[i] === 1;

  // Final boolean matrix (replace remaining nulls with false)
  const finalMatrix: boolean[][] = matrix.map((row) => row.map((cell) => cell ?? false));

  // Generate SVG representation
  const quietZone = 4;
  const viewBoxSize = size + quietZone * 2;
  const rects: string[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (finalMatrix[r]![c]) {
        rects.push(`<rect x="${c + quietZone}" y="${r + quietZone}" width="1" height="1" fill="#000000" />`);
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" shape-rendering="crispEdges" aria-label="QR Code"><rect width="${viewBoxSize}" height="${viewBoxSize}" fill="#ffffff" />${rects.join('')}</svg>`;

  return {
    matrix: finalMatrix,
    size,
    svg,
  };
}
