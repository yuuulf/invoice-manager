import path from "node:path";
import PDFDocument from "pdfkit";
import { formatAmount } from "@/lib/invoices/calc";
import type { InvoiceSnapshot } from "@/lib/invoices/snapshot";
import {
  bankLines,
  formatBilledAmount,
  formatJapaneseDate,
  formatPeriod,
  formatQuantityWithUnit,
  noteLines,
  ownerGroups,
  recipientLines,
} from "./invoice-text";

// 配置は spec.md 8.2（サンプル PDF の配置）に合わせる。単位は pt（1mm ≒ 2.835pt）
const mm = (value: number) => value * 2.8346;

const PAGE = { width: mm(210), height: mm(297) };
const LEFT = mm(16);
const RIGHT = PAGE.width - mm(16);
const CONTENT_WIDTH = RIGHT - LEFT;
const TEXT = "#222222";
const LINE = "#333333";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const REGULAR = "NotoSansJP-Regular";
const BOLD = "NotoSansJP-Bold";

/** 明細の列幅（数量・単価・金額は固定、内容は残り） */
const COL = { quantity: mm(24), unitPrice: mm(24), amount: mm(28) };
const ROW_HEIGHT = mm(7.2);
const ITEM_ROWS = 10;
const CELL_PADDING = mm(2);

type Options = {
  /** 確定していない出力。SAMPLE の透かしを入れる（spec.md 7.4） */
  sample: boolean;
  /** データ印（PNG）。未登録なら null */
  seal: Buffer | null;
};

/** フォントを登録した A4 の PDF ドキュメント */
export function createDocument(title: string) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    info: { Title: title },
  });
  doc.registerFont(REGULAR, path.join(FONT_DIR, `${REGULAR}.otf`));
  doc.registerFont(BOLD, path.join(FONT_DIR, `${BOLD}.otf`));
  doc.fillColor(TEXT);
  return doc;
}

/** 請求書 PDF を作る（spec.md 8 章） */
export function renderInvoicePdf(
  snapshot: InvoiceSnapshot,
  { sample, seal }: Options,
): Promise<Buffer> {
  const doc = createDocument(`請求書 ${snapshot.invoiceNumber}`);

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  drawMeta(doc, snapshot);
  drawTitle(doc);
  drawRecipientBlock(doc, snapshot);
  drawOwnerBlock(doc, snapshot, seal);
  const tableBottom = drawItems(doc, snapshot);
  const payBottom = drawPayment(doc, snapshot, tableBottom + mm(12));
  drawNotes(doc, snapshot, payBottom + mm(8));
  if (sample) drawSampleWatermark(doc);

  doc.end();
  return done;
}

type Doc = PDFKit.PDFDocument;

function text(
  doc: Doc,
  value: string,
  x: number,
  y: number,
  options: PDFKit.Mixins.TextOptions & { font?: string; size?: number } = {},
) {
  const { font = REGULAR, size = 9.5, ...rest } = options;
  doc
    .font(font)
    .fontSize(size)
    .text(value, x, y, { lineBreak: false, ...rest });
}

/** 右上: 請求日・請求番号 */
function drawMeta(doc: Doc, s: InvoiceSnapshot) {
  const width = mm(90);
  const x = RIGHT - width;
  text(doc, `請求日：${formatJapaneseDate(s.issueDate)}`, x, mm(14), {
    width,
    align: "right",
  });
  text(doc, `請求番号：${s.invoiceNumber}`, x, mm(20), {
    width,
    align: "right",
  });
}

/** 上部中央: タイトル（字間を空ける） */
function drawTitle(doc: Doc) {
  doc.font(BOLD).fontSize(22);
  const spacing = 22 * 0.3;
  const value = "請求書";
  const width =
    doc.widthOfString(value, { characterSpacing: spacing }) - spacing;
  doc.text(value, (PAGE.width - width) / 2, mm(30), {
    lineBreak: false,
    characterSpacing: spacing,
  });
}

/** 件名は2行まで折り返す。それより長い分は「…」で省略する */
const SUBJECT_MAX_LINES = 2;
const SUBJECT_LABEL = "件名：";
const SUBJECT_SIZE = 10.5;
const RECIPIENT_SIZE = 13;

/**
 * 上段・左の縦位置。件名が2行になったら、リード文とご請求金額をその分下げて重ならないようにする
 */
export function layoutRecipientBlock(doc: Doc, s: InvoiceSnapshot) {
  const width = CONTENT_WIDTH * 0.52;
  const recipientY = mm(47);
  const recipientCount = recipientLines(s.client).length;
  const underlineY =
    recipientY + recipientCount * RECIPIENT_SIZE * 1.5 + mm(0.5);
  const subjectY = underlineY + mm(6);

  doc.font(BOLD).fontSize(SUBJECT_SIZE);
  const labelWidth = doc.widthOfString(SUBJECT_LABEL);
  const subjectWidth = width - labelWidth;
  doc.font(REGULAR).fontSize(SUBJECT_SIZE);
  const subjectLineHeight = doc.currentLineHeight(true);
  const subjectLines = Math.min(
    SUBJECT_MAX_LINES,
    Math.max(
      1,
      Math.round(
        doc.heightOfString(subjectText(s), { width: subjectWidth }) /
          subjectLineHeight,
      ),
    ),
  );

  const leadY = subjectY + mm(8) + (subjectLines - 1) * subjectLineHeight;
  const amountY = Math.max(mm(83), leadY + mm(10));
  return {
    width,
    recipientY,
    underlineY,
    subjectY,
    labelWidth,
    subjectWidth,
    subjectLines,
    subjectLineHeight,
    leadY,
    amountY,
  };
}

function subjectText(s: InvoiceSnapshot) {
  return `${s.subject}${formatPeriod(s.period)}`;
}

/** 上段・左: 宛名 → 件名 → リード文 → ご請求金額 */
function drawRecipientBlock(doc: Doc, s: InvoiceSnapshot) {
  const layout = layoutRecipientBlock(doc, s);
  const { width } = layout;

  doc.font(BOLD).fontSize(RECIPIENT_SIZE);
  const lines = recipientLines(s.client);
  const lineWidth = Math.min(
    width,
    Math.max(...lines.map((line) => doc.widthOfString(line))),
  );
  lines.forEach((line, i) => {
    text(doc, line, LEFT, layout.recipientY + i * RECIPIENT_SIZE * 1.5, {
      font: BOLD,
      size: RECIPIENT_SIZE,
      width,
      ellipsis: true,
    });
  });
  doc
    .moveTo(LEFT, layout.underlineY)
    .lineTo(LEFT + lineWidth, layout.underlineY)
    .lineWidth(1.1)
    .strokeColor(TEXT)
    .stroke();

  text(doc, SUBJECT_LABEL, LEFT, layout.subjectY, {
    font: BOLD,
    size: SUBJECT_SIZE,
  });
  text(doc, subjectText(s), LEFT + layout.labelWidth, layout.subjectY, {
    size: SUBJECT_SIZE,
    width: layout.subjectWidth,
    lineBreak: true,
    // 2行分の高さに収まらない分は「…」で省略する（端数で3行目が切れないよう少し余裕を持たせる）
    height: layout.subjectLineHeight * (layout.subjectLines + 0.5),
    ellipsis: true,
  });

  text(doc, "下記のとおりご請求申し上げます。", LEFT, layout.leadY);

  const amountY = layout.amountY;
  text(doc, "ご請求金額", LEFT, amountY + 2, { font: BOLD, size: 12 });
  text(doc, formatBilledAmount(s.total), LEFT, amountY, {
    font: BOLD,
    size: 15,
    width,
    align: "right",
  });
  const underline = amountY + 15 * 1.45;
  doc
    .moveTo(LEFT, underline)
    .lineTo(LEFT + width, underline)
    .lineWidth(1.1)
    .strokeColor(TEXT)
    .stroke();
}

/** 上段・右: 事業主情報。データ印は屋号・氏名の右に置き、文字と重ねない */
function drawOwnerBlock(doc: Doc, s: InvoiceSnapshot, seal: Buffer | null) {
  const sealSize = mm(20);
  const x = mm(144);
  const textWidth = RIGHT - sealSize - mm(2) - x;
  const groups = ownerGroups(s.owner);
  let y = mm(47);

  if (groups.names.tradeName) {
    text(doc, groups.names.tradeName, x, y, {
      font: BOLD,
      size: 11,
      width: textWidth,
      ellipsis: true,
    });
    y += 11 * 1.5;
  }
  text(doc, groups.names.name, x, y, {
    size: 10,
    width: textWidth,
    ellipsis: true,
  });
  y += 10 * 1.5 + mm(2.5);

  for (const line of groups.address) {
    text(doc, line, x, y, { size: 9, width: RIGHT - x, ellipsis: true });
    y += 9 * 1.65;
  }
  y += mm(2.5);
  for (const line of groups.contact) {
    text(doc, line, x, y, { size: 9, width: RIGHT - x, ellipsis: true });
    y += 9 * 1.65;
  }

  if (seal) {
    doc.image(seal, RIGHT - sealSize, mm(45), {
      fit: [sealSize, sealSize],
      align: "center",
      valign: "center",
    });
  }
}

/** 中段: 明細（10 行）と合計。表の下端の y を返す */
function drawItems(doc: Doc, s: InvoiceSnapshot) {
  const top = mm(100);
  const descriptionWidth =
    CONTENT_WIDTH - COL.quantity - COL.unitPrice - COL.amount;
  const xs = {
    description: LEFT,
    quantity: LEFT + descriptionWidth,
    unitPrice: LEFT + descriptionWidth + COL.quantity,
    amount: LEFT + descriptionWidth + COL.quantity + COL.unitPrice,
  };
  const widths = {
    description: descriptionWidth,
    quantity: COL.quantity,
    unitPrice: COL.unitPrice,
    amount: COL.amount,
  };
  const textY = (rowTop: number, size: number) =>
    rowTop + (ROW_HEIGHT - size * 1.45) / 2;

  // 見出し行
  doc.rect(LEFT, top, CONTENT_WIDTH, ROW_HEIGHT).fill("#e8e8e8");
  doc.fillColor(TEXT);
  const headings = [
    ["description", "内容"],
    ["quantity", "数量"],
    ["unitPrice", "単価"],
    ["amount", "金額"],
  ] as const;
  for (const [key, label] of headings) {
    text(doc, label, xs[key], textY(top, 9.5), {
      font: BOLD,
      width: widths[key],
      align: "center",
    });
  }

  // 明細行（入力のない行は空欄）
  for (let row = 0; row < ITEM_ROWS; row++) {
    const rowTop = top + ROW_HEIGHT * (row + 1);
    const item = s.items.find((i) => i.position === row);
    if (!item) continue;
    const y = textY(rowTop, 9.5);
    text(doc, item.description, xs.description + CELL_PADDING, y, {
      width: widths.description - CELL_PADDING * 2,
      ellipsis: true,
    });
    const right = (key: "quantity" | "unitPrice" | "amount", value: string) =>
      text(doc, value, xs[key] + CELL_PADDING, y, {
        width: widths[key] - CELL_PADDING * 2,
        align: "right",
      });
    right("quantity", formatQuantityWithUnit(item.quantity, item.unit));
    right("unitPrice", formatAmount(item.unitPrice));
    right("amount", formatAmount(item.amount));
  }

  // 罫線
  const bottom = top + ROW_HEIGHT * (ITEM_ROWS + 1);
  doc.lineWidth(0.75).strokeColor(LINE);
  for (let row = 0; row <= ITEM_ROWS + 1; row++) {
    const y = top + ROW_HEIGHT * row;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).stroke();
  }
  for (const x of [LEFT, xs.quantity, xs.unitPrice, xs.amount, RIGHT]) {
    doc.moveTo(x, top).lineTo(x, bottom).stroke();
  }

  // 合計（数量列〜単価列の幅に「合計」、金額列に合計値）
  const totalBottom = bottom + ROW_HEIGHT;
  for (const x of [xs.quantity, xs.amount, RIGHT]) {
    doc.moveTo(x, bottom).lineTo(x, totalBottom).stroke();
  }
  doc.moveTo(xs.quantity, totalBottom).lineTo(RIGHT, totalBottom).stroke();
  text(doc, "合計", xs.quantity, textY(bottom, 9.5), {
    font: BOLD,
    width: COL.quantity + COL.unitPrice,
    align: "center",
  });
  text(
    doc,
    formatAmount(s.total),
    xs.amount + CELL_PADDING,
    textY(bottom, 10.5),
    {
      font: BOLD,
      size: 10.5,
      width: COL.amount - CELL_PADDING * 2,
      align: "right",
    },
  );
  return totalBottom;
}

/** 下段: 支払期限・振込先。下端の y を返す */
function drawPayment(doc: Doc, s: InvoiceSnapshot, top: number) {
  const lineHeight = 9.5 * 1.8;
  const dueLabel = "支払期限（お振込み期限）：";
  doc.font(BOLD).fontSize(9.5);
  const valueX = LEFT + doc.widthOfString(dueLabel) + mm(2);
  text(doc, dueLabel, LEFT, top, { font: BOLD });
  text(doc, formatJapaneseDate(s.dueDate), valueX, top);

  const bankTop = top + lineHeight + mm(3);
  text(doc, "振込先：", LEFT, bankTop, { font: BOLD });
  const [line1, line2] = bankLines(s.owner);
  const width = RIGHT - valueX;
  text(doc, line1, valueX, bankTop, { width, ellipsis: true });
  text(doc, line2, valueX, bankTop + lineHeight, { width, ellipsis: true });
  return bankTop + lineHeight * 2;
}

/** 最下段: 備考（枠線で囲む） */
function drawNotes(doc: Doc, s: InvoiceSnapshot, top: number) {
  const padding = { x: mm(4), y: mm(3) };
  const lineHeight = 9.5 * 1.8;
  const height = Math.max(mm(42), PAGE.height - mm(14) - top);
  doc
    .lineWidth(0.75)
    .strokeColor(LINE)
    .rect(LEFT, top, CONTENT_WIDTH, height)
    .stroke();

  let y = top + padding.y;
  text(doc, "備考：", LEFT + padding.x, y, { font: BOLD });
  y += lineHeight;
  doc.font(REGULAR).fontSize(9.5);
  const width = CONTENT_WIDTH - padding.x * 2;
  const bottom = top + height - padding.y;
  for (const line of noteLines(s.client.feeBearer, s.notes)) {
    const lineBlockHeight = Math.max(
      lineHeight,
      doc.heightOfString(line || " ", {
        width,
        lineGap: lineHeight - 9.5 * 1.2,
      }),
    );
    if (y + lineBlockHeight > bottom) break;
    doc.text(line, LEFT + padding.x, y, {
      width,
      lineGap: lineHeight - 9.5 * 1.2,
    });
    y += lineBlockHeight;
  }
}

/** 確定前の出力に入れる SAMPLE の透かし。内容が読めるよう薄く重ねる */
function drawSampleWatermark(doc: Doc) {
  doc.save();
  doc.rotate(-30, { origin: [PAGE.width / 2, PAGE.height / 2] });
  doc.font(BOLD).fontSize(150).fillColor("#d32f2f").fillOpacity(0.12);
  const value = "SAMPLE";
  const width = doc.widthOfString(value);
  doc.text(value, (PAGE.width - width) / 2, PAGE.height / 2 - 100, {
    lineBreak: false,
  });
  doc.restore();
}
