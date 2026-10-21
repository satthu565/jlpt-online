/**
 * Ánh xạ mã từ loại JMdict sang nhãn tiếng Việt dùng chung (H05).
 * n -> Danh từ
 * v1, v5* -> Động từ
 * vs -> Danh động từ (đi với する)
 * vt/vi -> Ngoại động từ/Nội động từ (bổ sung)
 * adj-i -> Tính từ đuôi い
 * adj-na -> Tính từ đuôi な
 * adv -> Phó từ
 * prt -> Trợ từ
 * conj -> Liên từ
 * int -> Thán từ
 * pn -> Đại từ
 * ctr -> Trợ số từ
 * exp -> Cụm từ
 * mã khác giữ nguyên trong ngoặc.
 */
export const POS_CODE_MAP: Record<string, string> = {
  n: 'Danh từ',
  noun: 'Danh từ',
  v1: 'Động từ',
  'v1-s': 'Động từ',
  vs: 'Danh động từ (đi với する)',
  'vs-i': 'Danh động từ (đi với する)',
  'vs-s': 'Danh động từ (đi với する)',
  'vs-c': 'Danh động từ (đi với する)',
  vt: 'Ngoại động từ',
  vi: 'Nội động từ',
  'adj-i': 'Tính từ đuôi い',
  'adj-na': 'Tính từ đuôi な',
  adjective: 'Tính từ đuôi い',
  adv: 'Phó từ',
  'adv-to': 'Phó từ',
  adverb: 'Phó từ',
  prt: 'Trợ từ',
  particle: 'Trợ từ',
  conj: 'Liên từ',
  conjunction: 'Liên từ',
  int: 'Thán từ',
  interjection: 'Thán từ',
  pn: 'Đại từ',
  pronoun: 'Đại từ',
  ctr: 'Trợ số từ',
  counter: 'Trợ số từ',
  exp: 'Cụm từ',
  expression: 'Cụm từ',
};

export function mapPosCode(rawCode: string): string {
  const code = rawCode.trim();
  if (!code) return '';

  if (POS_CODE_MAP[code]) {
    return POS_CODE_MAP[code]!;
  }

  // v5* pattern (v5, v5k, v5s, v5r, v5t, v5n, v5m, v5g, v5b, v5u, v5k-s, v5r-i, v5aru...)
  if (
    code.startsWith('v5') ||
    code === 'v1' ||
    code === 'verb' ||
    code === 'vk' ||
    code === 'vz' ||
    code.startsWith('v4')
  ) {
    return 'Động từ';
  }

  // vs* pattern (vs, vs-i, vs-s, vs-c...)
  if (code.startsWith('vs')) {
    return 'Danh động từ (đi với する)';
  }

  // If already in parentheses: (code)
  if (code.startsWith('(') && code.endsWith(')')) {
    return code;
  }

  // Mã khác giữ nguyên trong ngoặc
  return `(${code})`;
}

export function getPosLabels(pos: string | string[] | null | undefined): string[] {
  if (!pos) return [];

  const codes: string[] = Array.isArray(pos)
    ? pos.flatMap((p) => p.split(/[,;\s]+/))
    : pos.split(/[,;\s]+/);

  const labels: string[] = [];
  const seen = new Set<string>();

  for (const raw of codes) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const label = mapPosCode(trimmed);
    if (label && !seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }

  return labels;
}
