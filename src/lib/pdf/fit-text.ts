// PDF の欄に文字を収める（spec.md 8.3）。まず字を小さくして 1 行に収め、
// 下限の大きさでも入らなければ折り返す。省略（…）はしない

type Doc = PDFKit.PDFDocument;

export type FitOptions = {
  font: string;
  /** ふつうの字の大きさ（pt） */
  size: number;
  /** 小さくするときの下限（pt） */
  minSize: number;
  /** 欄の幅（pt） */
  width: number;
  /** 行の高さ（字の大きさの何倍か） */
  lineFactor: number;
};

export type Fitted = {
  font: string;
  size: number;
  lines: string[];
  lineHeight: number;
  /** 全体の高さ */
  height: number;
  /** いちばん長い行の幅 */
  width: number;
};

const SIZE_STEP = 0.25;

/** 英数字の続き（単語・メールアドレス・数字）はなるべく途中で折り返さない */
const TOKEN = /[\x21-\x7e]+|\s+|./gu;

/** 今の字の大きさで、幅に収まるように折り返す（日本語は 1 文字ずつ、英数字は単語ごと） */
export function wrapText(doc: Doc, value: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  const push = () => {
    lines.push(line.trimEnd());
    line = "";
  };
  for (const token of value.match(TOKEN) ?? []) {
    if (doc.widthOfString(line + token) <= width) {
      line += token;
      continue;
    }
    if (/^\s+$/.test(token)) {
      push();
      continue;
    }
    if (line) push();
    if (doc.widthOfString(token) <= width) {
      line = token;
      continue;
    }
    // 1 語が幅より長い（長いメールアドレスなど）ときは文字ごとに折り返す
    for (const char of token) {
      if (line && doc.widthOfString(line + char) > width) push();
      line += char;
    }
  }
  if (line || lines.length === 0) push();
  return lines;
}

function fitted(
  doc: Doc,
  font: string,
  size: number,
  lines: string[],
  lineFactor: number,
): Fitted {
  doc.font(font).fontSize(size);
  const lineHeight = size * lineFactor;
  return {
    font,
    size,
    lines,
    lineHeight,
    height: lineHeight * lines.length,
    width: Math.max(...lines.map((line) => doc.widthOfString(line))),
  };
}

/** 字を小さくして 1 行に収め、下限でも入らなければ下限の大きさで折り返す（行数は制限しない） */
export function fitText(doc: Doc, value: string, options: FitOptions): Fitted {
  const { font, size, minSize, width, lineFactor } = options;
  for (let s = size; s >= minSize; s -= SIZE_STEP) {
    doc.font(font).fontSize(s);
    if (doc.widthOfString(value) <= width) {
      return fitted(doc, font, s, [value], lineFactor);
    }
  }
  doc.font(font).fontSize(minSize);
  return fitted(doc, font, minSize, wrapText(doc, value, width), lineFactor);
}

/**
 * 高さの決まった欄（明細の行など）に収める。1 行に収まらなければ折り返し、
 * 高さに入る大きさまで小さくする（下限でも入らなければ下限の大きさで折り返す）
 */
export function fitInBox(
  doc: Doc,
  value: string,
  options: FitOptions & { height: number },
): Fitted {
  const { font, size, minSize, width, lineFactor, height } = options;
  for (let s = size; s >= minSize; s -= SIZE_STEP) {
    doc.font(font).fontSize(s);
    if (doc.widthOfString(value) <= width) {
      return fitted(doc, font, s, [value], lineFactor);
    }
  }
  for (let s = size; s >= minSize; s -= SIZE_STEP) {
    doc.font(font).fontSize(s);
    const lines = wrapText(doc, value, width);
    if (lines.length * s * lineFactor <= height) {
      return fitted(doc, font, s, lines, lineFactor);
    }
  }
  doc.font(font).fontSize(minSize);
  return fitted(doc, font, minSize, wrapText(doc, value, width), lineFactor);
}

/**
 * 収めた文字を描く。align が right / center なら width の中で寄せる。
 * valign が middle なら行の高さの中で字を上下中央に置く（top なら各行の上端に置く）
 */
export function drawFitted(
  doc: Doc,
  f: Fitted,
  x: number,
  y: number,
  {
    align = "left",
    valign = "top",
    width = 0,
  }: {
    align?: "left" | "right" | "center";
    valign?: "top" | "middle";
    width?: number;
  } = {},
) {
  doc.font(f.font).fontSize(f.size);
  const offset =
    valign === "middle" ? (f.lineHeight - doc.currentLineHeight()) / 2 : 0;
  f.lines.forEach((line, i) => {
    const lineWidth = doc.widthOfString(line);
    const dx =
      align === "right"
        ? width - lineWidth
        : align === "center"
          ? (width - lineWidth) / 2
          : 0;
    doc.text(line, x + dx, y + offset + f.lineHeight * i, {
      lineBreak: false,
    });
  });
}
