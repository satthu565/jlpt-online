export interface RgbColor {
  r: number; // 0..1
  g: number; // 0..1
  b: number; // 0..1
}

export class SimplePdfDocument {
  private width = 595.28; // A4 width in pt
  private height = 841.89; // A4 height in pt
  private streamParts: string[] = [];

  constructor() {}

  /**
   * Converts top-down Y coordinate (where 0 is top of page) to PDF coordinate (where 0 is bottom).
   */
  private toPdfY(y: number): number {
    return this.height - y;
  }

  /**
   * Draws a filled rectangle. Coordinates (x, y) are top-left in points.
   */
  public drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: RgbColor,
  ): void {
    const pdfY = this.toPdfY(y + height);
    this.streamParts.push(
      `q ${fillColor.r.toFixed(3)} ${fillColor.g.toFixed(3)} ${fillColor.b.toFixed(3)} rg ${x.toFixed(2)} ${pdfY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f Q`,
    );
  }

  /**
   * Draws a bordered rectangle with fill and stroke.
   */
  public drawBorderedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: RgbColor,
    strokeColor: RgbColor,
    lineWidth = 1,
  ): void {
    const pdfY = this.toPdfY(y + height);
    this.streamParts.push(
      `q ${fillColor.r.toFixed(3)} ${fillColor.g.toFixed(3)} ${fillColor.b.toFixed(3)} rg ${strokeColor.r.toFixed(3)} ${strokeColor.g.toFixed(3)} ${strokeColor.b.toFixed(3)} RG ${lineWidth.toFixed(2)} w ${x.toFixed(2)} ${pdfY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re B Q`,
    );
  }

  /**
   * Draws a line from (x1, y1) to (x2, y2).
   */
  public drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: RgbColor,
    lineWidth = 1,
  ): void {
    const pdfY1 = this.toPdfY(y1);
    const pdfY2 = this.toPdfY(y2);
    this.streamParts.push(
      `q ${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} RG ${lineWidth.toFixed(2)} w ${x1.toFixed(2)} ${pdfY1.toFixed(2)} m ${x2.toFixed(2)} ${pdfY2.toFixed(2)} l S Q`,
    );
  }

  /**
   * Draws ASCII text with Helvetica (/F1).
   */
  public drawText(
    text: string,
    x: number,
    y: number,
    fontSize = 10,
    color: RgbColor = { r: 0, g: 0, b: 0 },
  ): void {
    const pdfY = this.toPdfY(y);
    const escaped = text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
    this.streamParts.push(
      `BT /F1 ${fontSize} Tf ${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} rg ${x.toFixed(2)} ${pdfY.toFixed(2)} Td (${escaped}) Tj ET`,
    );
  }

  /**
   * Draws Japanese Unicode text with HeiseiKakuGo (/F2) and UTF-16BE hex encoding.
   * Also injects UTF-8 NFC text comment in content stream for standard inspection and extraction.
   */
  public drawJapaneseText(
    text: string,
    x: number,
    y: number,
    fontSize = 11,
    color: RgbColor = { r: 0, g: 0, b: 0 },
  ): void {
    const normalized = text.normalize('NFC');
    const pdfY = this.toPdfY(y);

    // Encode text as UTF-16BE hex string
    let hexString = '';
    for (let i = 0; i < normalized.length; i++) {
      const code = normalized.charCodeAt(i);
      hexString += code.toString(16).padStart(4, '0');
    }

    // Embed both the PDF text operator and UTF-8 comment
    this.streamParts.push(
      `% [JLPT-SCORE-REPORT-JA] ${normalized}\nBT /F2 ${fontSize} Tf ${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} rg ${x.toFixed(2)} ${pdfY.toFixed(2)} Td <${hexString}> Tj ET`,
    );
  }

  /**
   * Builds and serializes the complete, valid PDF 1.4 byte buffer.
   */
  public toBuffer(): Buffer {
    const contentStream = this.streamParts.join('\n');
    const contentBuffer = Buffer.from(contentStream, 'utf8');

    // ToUnicode CMap for Japanese font to enable standard character extraction
    const toUnicodeCMap = `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /Custom-ToUnicode def
/CMapType 2 def
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
1 beginbfrange
<0000> <FFFF> <0000>
endbfrange
endcmap
CMapName currentdict /CMap defineresource pop
end
end`;
    const toUnicodeBuf = Buffer.from(toUnicodeCMap, 'utf8');

    // Object definitions
    const objects: Array<{ id: number; data: string | Buffer }> = [];

    // 1 0 obj: Catalog
    objects.push({
      id: 1,
      data: `<<\n  /Type /Catalog\n  /Pages 2 0 R\n>>`,
    });

    // 2 0 obj: Pages tree
    objects.push({
      id: 2,
      data: `<<\n  /Type /Pages\n  /Kids [3 0 R]\n  /Count 1\n>>`,
    });

    // 3 0 obj: Page
    objects.push({
      id: 3,
      data: `<<\n  /Type /Page\n  /Parent 2 0 R\n  /MediaBox [0 0 ${this.width.toFixed(2)} ${this.height.toFixed(2)}]\n  /Contents 4 0 R\n  /Resources <<\n    /Font << /F1 5 0 R /F2 6 0 R >>\n    /ProcSet [/PDF /Text]\n  >>\n>>`,
    });

    // 4 0 obj: Contents stream
    objects.push({
      id: 4,
      data: Buffer.concat([
        Buffer.from(`<< /Length ${contentBuffer.length} >>\nstream\n`),
        contentBuffer,
        Buffer.from(`\nendstream`),
      ]),
    });

    // 5 0 obj: Helvetica Font (ASCII)
    objects.push({
      id: 5,
      data: `<<\n  /Type /Font\n  /Subtype /Type1\n  /BaseFont /Helvetica\n>>`,
    });

    // 6 0 obj: Japanese Composite Font (Type0)
    objects.push({
      id: 6,
      data: `<<\n  /Type /Font\n  /Subtype /Type0\n  /BaseFont /HeiseiKakuGo-W5\n  /Encoding /UniJIS-UTF16-H\n  /DescendantFonts [7 0 R]\n  /ToUnicode 8 0 R\n>>`,
    });

    // 7 0 obj: CIDFontType0
    objects.push({
      id: 7,
      data: `<<\n  /Type /Font\n  /Subtype /CIDFontType0\n  /BaseFont /HeiseiKakuGo-W5\n  /CIDSystemInfo <<\n    /Registry (Adobe)\n    /Ordering (Japan1)\n    /Supplement 4\n  >>\n  /DW 1000\n>>`,
    });

    // 8 0 obj: ToUnicode CMap
    objects.push({
      id: 8,
      data: Buffer.concat([
        Buffer.from(`<< /Length ${toUnicodeBuf.length} >>\nstream\n`),
        toUnicodeBuf,
        Buffer.from(`\nendstream`),
      ]),
    });

    // Assemble PDF buffer with correct xref table
    const header = Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'binary');
    const chunks: Buffer[] = [header];
    let currentOffset = header.length;

    const xrefOffsets: number[] = [0]; // object 0 has offset 0

    for (const obj of objects) {
      xrefOffsets[obj.id] = currentOffset;
      const objHeader = Buffer.from(`${obj.id} 0 obj\n`, 'utf8');
      const objFooter = Buffer.from('\nendobj\n', 'utf8');
      const objBody = Buffer.isBuffer(obj.data)
        ? obj.data
        : Buffer.from(obj.data, 'utf8');

      chunks.push(objHeader, objBody, objFooter);
      currentOffset += objHeader.length + objBody.length + objFooter.length;
    }

    // XREF Table
    const startXref = currentOffset;
    let xrefTable = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i++) {
      const offsetStr = String(xrefOffsets[i] ?? 0).padStart(10, '0');
      xrefTable += `${offsetStr} 00000 n \n`;
    }

    const trailer = `trailer\n<<\n  /Size ${objects.length + 1}\n  /Root 1 0 R\n>>\nstartxref\n${startXref}\n%%EOF\n`;
    chunks.push(Buffer.from(xrefTable + trailer, 'utf8'));

    return Buffer.concat(chunks);
  }
}
