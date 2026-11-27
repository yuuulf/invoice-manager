import path from "node:path";
import PDFDocument from "pdfkit";
import { formatAmount } from "@/lib/invoices/calc";
import type { InvoiceSnapshot } from "@/lib/invoices/snapshot";
import {
  bankLines,
  formatBilledAmount,
  formatJapaneseDate,
  metaLines,
  formatPeriod,
  formatQuantityWithUnit,
  noteLines,
  ownerGroups,
  recipientLines,
  totalRows,
} from "./invoice-text";
import { drawFitted, fitInBox, fitText, type Fitted } from "./fit-text";

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
/** 明細の上端。件名が長くご請求金額が下がったとき・事業主情報が長いときは、その分下げる */
const ITEMS_TOP = mm(100);
/** 欄に入りきらない文字を小さくするときの下限（pt。spec.md 8.3） */
const MIN_SIZE = 7;
/** 宛名は大きく見せたいので、下限を大きめにする */
const RECIPIENT_MIN_SIZE = 9;

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
  const recipient = drawRecipientBlock(doc, snapshot);
  const ownerBottom = drawOwnerBlock(doc, snapshot, seal);
  const itemsTop = Math.max(recipient.itemsTop, ownerBottom + mm(5));
  const tableBottom = drawItems(doc, snapshot, itemsTop);
  const gaps = lowerGaps(doc, snapshot, tableBottom);
  const payBottom = drawPayment(
    doc,
    snapshot,
    tableBottom + gaps.beforePayment,
  );
  drawNotes(doc, snapshot, payBottom + gaps.beforeNotes);
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

/** 右上: 請求日・請求書番号 */
function drawMeta(doc: Doc, s: InvoiceSnapshot) {
  const width = mm(90);
  const x = RIGHT - width;
  const [issueDate, invoiceNumber] = metaLines(s);
  text(doc, issueDate, x, mm(14), { width, align: "right" });
  text(doc, invoiceNumber, x, mm(20), { width, align: "right" });
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

const SUBJECT_LABEL = "件名：";
const SUBJECT_SIZE = 10.5;
const RECIPIENT_SIZE = 13;

/**
 * 上段・左の縦位置。件名は省略せずに折り返し、行が増えた分だけリード文・ご請求金額・明細を下げて重ならないようにする
 */
export function layoutRecipientBlock(doc: Doc, s: InvoiceSnapshot) {
  const width = CONTENT_WIDTH * 0.52;
  const recipientY = mm(47);
  // 会社名・部署が長いときは字を小さくし、それでも入らなければ折り返す
  const recipient = recipientLines(s.client).map((line) =>
    fitText(doc, line, {
      font: BOLD,
      size: RECIPIENT_SIZE,
      minSize: RECIPIENT_MIN_SIZE,
      width,
      lineFactor: 1.5,
    }),
  );
  const underlineY =
    recipientY + recipient.reduce((sum, f) => sum + f.height, 0) + mm(0.5);
  const subjectY = underlineY + mm(6);

  doc.font(BOLD).fontSize(SUBJECT_SIZE);
  const labelWidth = doc.widthOfString(SUBJECT_LABEL);
  const subjectWidth = width - labelWidth;
  doc.font(REGULAR).fontSize(SUBJECT_SIZE);
  const subjectLineHeight = doc.currentLineHeight(true);
  const subjectLines = Math.max(
    1,
    Math.round(
      doc.heightOfString(subjectText(s), { width: subjectWidth }) /
        subjectLineHeight,
    ),
  );

  const leadY = subjectY + mm(8) + (subjectLines - 1) * subjectLineHeight;
  const amountY = Math.max(mm(83), leadY + mm(10));
  const amountUnderlineY = amountY + 15 * 1.45;
  const itemsTop = Math.max(ITEMS_TOP, amountUnderlineY + mm(4));
  return {
    width,
    recipientY,
    recipient,
    underlineY,
    subjectY,
    labelWidth,
    subjectWidth,
    subjectLines,
    subjectLineHeight,
    leadY,
    amountY,
    amountUnderlineY,
    itemsTop,
  };
}

function subjectText(s: InvoiceSnapshot) {
  return `${s.subject}${formatPeriod(s.period)}`;
}

/** 上段・左: 宛名 → 件名 → リード文 → ご請求金額 */
function drawRecipientBlock(doc: Doc, s: InvoiceSnapshot) {
  const layout = layoutRecipientBlock(doc, s);
  const { width } = layout;

  let y = layout.recipientY;
  for (const f of layout.recipient) {
    drawFitted(doc, f, LEFT, y);
    y += f.height;
  }
  const lineWidth = Math.min(
    width,
    Math.max(...layout.recipient.map((f) => f.width)),
  );
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
  const underline = layout.amountUnderlineY;
  doc
    .moveTo(LEFT, underline)
    .lineTo(LEFT + width, underline)
    .lineWidth(1.1)
    .strokeColor(TEXT)
    .stroke();
  return layout;
}

const SEAL_SIZE = mm(20);
const SEAL_TOP = mm(45);
/** 事業主情報の左端。長い項目があるときは、宛名の欄にかからない範囲（OWNER_MIN_X）まで左に広げる */
const OWNER_X = mm(144);
const OWNER_MIN_X = mm(118);

/**
 * 上段・右の事業主情報の配置。データ印は屋号・氏名の右に置き、文字と重ねない。
 * 入りきらない項目は字を小さくし、それでも入らなければ折り返す（spec.md 8.3）
 */
export function layoutOwnerBlock(
  doc: Doc,
  s: InvoiceSnapshot,
  hasSeal: boolean,
) {
  const groups = ownerGroups(s.owner);
  const sealSpace = hasSeal ? SEAL_SIZE + mm(2) : 0;
  const names = [
    ...(groups.names.tradeName
      ? [{ value: groups.names.tradeName, font: BOLD, size: 11 }]
      : []),
    { value: groups.names.name, font: REGULAR, size: 10 },
  ];
  const lines: {
    value: string;
    font: string;
    size: number;
    lineFactor: number;
    gapBefore: number;
  }[] = [
    ...names.map((n) => ({ ...n, lineFactor: 1.5, gapBefore: 0 })),
    ...[groups.address, groups.contact].flatMap((group) =>
      group.map((value, i) => ({
        value,
        font: REGULAR,
        size: 9,
        lineFactor: 1.65,
        gapBefore: i === 0 ? mm(2.5) : 0,
      })),
    ),
  ];
  const sealBottom = SEAL_TOP + SEAL_SIZE;
  const top = mm(47);
  /** データ印の横に来る行（データ印と重ならないよう、データ印の手前までの幅にする） */
  const besideSeal = (y: number) => hasSeal && y < sealBottom;

  // ふつうの大きさで 1 行に入る幅を確保できるよう、左端を決める
  let y = top;
  let needed = 0;
  for (const line of lines) {
    y += line.gapBefore;
    doc.font(line.font).fontSize(line.size);
    needed = Math.max(
      needed,
      doc.widthOfString(line.value) + (besideSeal(y) ? sealSpace : 0),
    );
    y += line.size * line.lineFactor;
  }
  const x = Math.min(OWNER_X, Math.max(OWNER_MIN_X, RIGHT - needed));

  // 入りきらない行は字を小さくし、それでも入らなければ折り返す
  const entries: { fitted: Fitted; y: number }[] = [];
  y = top;
  for (const line of lines) {
    y += line.gapBefore;
    const fitted = fitText(doc, line.value, {
      font: line.font,
      size: line.size,
      minSize: MIN_SIZE,
      width: RIGHT - x - (besideSeal(y) ? sealSpace : 0),
      lineFactor: line.lineFactor,
    });
    entries.push({ fitted, y });
    y += fitted.height;
  }
  const bottom = Math.max(y, hasSeal ? sealBottom : 0);
  return { x, entries, bottom };
}

/** 上段・右: 事業主情報。下端の y を返す */
function drawOwnerBlock(doc: Doc, s: InvoiceSnapshot, seal: Buffer | null) {
  const layout = layoutOwnerBlock(doc, s, seal !== null);
  for (const { fitted, y } of layout.entries) {
    drawFitted(doc, fitted, layout.x, y);
  }
  if (seal) {
    doc.image(seal, RIGHT - SEAL_SIZE, SEAL_TOP, {
      fit: [SEAL_SIZE, SEAL_SIZE],
      align: "center",
      valign: "center",
    });
  }
  return layout.bottom;
}

/**
 * 明細表の 1 マスに文字を描く。入りきらなければ字を小さくし、それでも入らなければ
 * 行の高さに収まるように折り返す（spec.md 8.3）
 */
export function fitCell(
  doc: Doc,
  value: string,
  width: number,
  { font = REGULAR, size = 9.5 }: { font?: string; size?: number } = {},
) {
  return fitInBox(doc, value, {
    font,
    size,
    minSize: MIN_SIZE,
    width: width - CELL_PADDING * 2,
    height: ROW_HEIGHT - mm(1),
    lineFactor: 1.2,
  });
}

function drawCell(
  doc: Doc,
  value: string,
  x: number,
  rowTop: number,
  width: number,
  options: { align: "left" | "right"; font?: string; size?: number },
) {
  const fitted = fitCell(doc, value, width, options);
  drawFitted(
    doc,
    fitted,
    x + CELL_PADDING,
    rowTop + (ROW_HEIGHT - fitted.height) / 2,
    {
      align: options.align,
      valign: "middle",
      width: width - CELL_PADDING * 2,
    },
  );
}

/** 中段: 明細（10 行）と合計。表の下端の y を返す */
function drawItems(doc: Doc, s: InvoiceSnapshot, top: number) {
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
    const cell = (
      key: keyof typeof xs,
      value: string,
      align: "left" | "right",
    ) => drawCell(doc, value, xs[key], rowTop, widths[key], { align });
    cell("description", item.description, "left");
    cell("quantity", formatQuantityWithUnit(item.quantity, item.unit), "right");
    cell("unitPrice", formatAmount(item.unitPrice), "right");
    cell("amount", formatAmount(item.amount), "right");
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

  // 合計欄（数量列〜単価列の幅にラベル、金額列に値）。税込なら小計・消費税相当額・合計の 3 行
  const rows = totalRows(s);
  const totalBottom = bottom + ROW_HEIGHT * rows.length;
  for (const x of [xs.quantity, xs.amount, RIGHT]) {
    doc.moveTo(x, bottom).lineTo(x, totalBottom).stroke();
  }
  rows.forEach((row, i) => {
    const rowTop = bottom + ROW_HEIGHT * i;
    doc
      .moveTo(xs.quantity, rowTop + ROW_HEIGHT)
      .lineTo(RIGHT, rowTop + ROW_HEIGHT)
      .stroke();
    text(doc, row.label, xs.quantity, textY(rowTop, 9.5), {
      font: row.bold ? BOLD : REGULAR,
      width: COL.quantity + COL.unitPrice,
      align: "center",
    });
    drawCell(doc, row.value, xs.amount, rowTop, COL.amount, {
      align: "right",
      font: row.bold ? BOLD : REGULAR,
      size: row.bold ? 10.5 : 9.5,
    });
  });
  return totalBottom;
}

const PAYMENT_LINE_HEIGHT = 9.5 * 1.8;
/** ページの下余白 */
const BOTTOM_MARGIN = mm(14);

const DUE_LABEL = "支払期限（お振込み期限）：";

/** 下段の支払期限・振込先の配置（top からの相対位置）。振込先が長いときは字を小さくし、それでも入らなければ折り返す */
function layoutPayment(doc: Doc, s: InvoiceSnapshot) {
  doc.font(BOLD).fontSize(9.5);
  const valueX = LEFT + doc.widthOfString(DUE_LABEL) + mm(2);
  const bankOffset = PAYMENT_LINE_HEIGHT + mm(3);
  const bank = bankLines(s.owner, s.client.feeBearer).map((line) =>
    fitText(doc, line, {
      font: REGULAR,
      size: 9.5,
      minSize: MIN_SIZE,
      width: RIGHT - valueX,
      lineFactor: 1.8,
    }),
  );
  const height = bankOffset + bank.reduce((sum, f) => sum + f.height, 0);
  return { valueX, bankOffset, bank, height };
}

/** 下段: 支払期限・振込先。下端の y を返す */
function drawPayment(doc: Doc, s: InvoiceSnapshot, top: number) {
  const layout = layoutPayment(doc, s);
  text(doc, DUE_LABEL, LEFT, top, { font: BOLD });
  text(doc, formatJapaneseDate(s.dueDate), layout.valueX, top);
  const bankTop = top + layout.bankOffset;
  text(doc, "振込先：", LEFT, bankTop, { font: BOLD });
  let y = bankTop;
  for (const fitted of layout.bank) {
    drawFitted(doc, fitted, layout.valueX, y);
    y += fitted.height;
  }
  return top + layout.height;
}

/**
 * 明細表〜支払期限、支払期限〜備考の間隔。ふつうは 12mm・8mm。
 * 備考を字の大きさの下限まで小さくしても備考欄に入らない場合だけ詰める（spec.md 8.4）
 */
export function lowerGaps(doc: Doc, s: InvoiceSnapshot, tableBottom: number) {
  const paymentHeight = layoutPayment(doc, s).height;
  const notesHeight = (gaps: { beforePayment: number; beforeNotes: number }) =>
    PAGE.height -
    BOTTOM_MARGIN -
    (tableBottom + gaps.beforePayment + paymentHeight + gaps.beforeNotes);
  const normal = { beforePayment: mm(12), beforeNotes: mm(8) };
  if (layoutNotes(doc, s.notes, notesHeight(normal)).fits) return normal;
  return { beforePayment: mm(6), beforeNotes: mm(4) };
}

const NOTES_SIZE = 9.5;
const NOTES_PADDING = { x: mm(4), y: mm(3) };
const NOTES_WIDTH = CONTENT_WIDTH - NOTES_PADDING.x * 2;
/** 字を小さくするときの下限（pt） */
const NOTES_MIN_SIZE = 5;

/** 備考を、指定した字の大きさで PDF の備考欄の幅に折り返したときの行数 */
function wrappedNoteLines(doc: Doc, notes: string | null, size: number) {
  doc.font(REGULAR).fontSize(size);
  const lineHeight = doc.currentLineHeight();
  return noteLines(notes).map((line) =>
    Math.max(
      1,
      Math.round(
        doc.heightOfString(line || " ", { width: NOTES_WIDTH, lineGap: 0 }) /
          lineHeight,
      ),
    ),
  );
}

/**
 * 備考欄の字の大きさと行の高さ。欄の高さ（件名の長さ・税込・手数料の行で変わる）に入りきらなければ、
 * 行間を詰め、それでも入らなければ字を小さくする（spec.md 8.4）
 */
export function layoutNotes(doc: Doc, notes: string | null, height: number) {
  const candidates: { size: number; lineFactor: number }[] = [
    { size: NOTES_SIZE, lineFactor: 1.8 },
  ];
  for (let size = NOTES_SIZE; size >= NOTES_MIN_SIZE; size -= 0.25) {
    candidates.push({ size, lineFactor: 1.5 });
  }
  const fits = ({ size, lineFactor }: (typeof candidates)[number]) => {
    const lines = wrappedNoteLines(doc, notes, size).reduce((a, b) => a + b, 0);
    // 見出し「備考：」の 1 行 + 本文
    return NOTES_PADDING.y * 2 + size * lineFactor * (1 + lines) <= height;
  };
  const chosen = candidates.find(fits) ?? candidates[candidates.length - 1];
  return {
    size: chosen.size,
    lineHeight: chosen.size * chosen.lineFactor,
    fits: candidates.some(fits),
  };
}

/** 最下段: 備考（枠線で囲む）。下余白までを備考欄にする */
function drawNotes(doc: Doc, s: InvoiceSnapshot, top: number) {
  const height = PAGE.height - BOTTOM_MARGIN - top;
  doc
    .lineWidth(0.75)
    .strokeColor(LINE)
    .rect(LEFT, top, CONTENT_WIDTH, height)
    .stroke();

  const { size, lineHeight } = layoutNotes(doc, s.notes, height);
  const x = LEFT + NOTES_PADDING.x;
  let y = top + NOTES_PADDING.y;
  text(doc, "備考：", x, y, { font: BOLD, size });
  y += lineHeight;

  const bottom = top + height - NOTES_PADDING.y;
  const counts = wrappedNoteLines(doc, s.notes, size);
  doc.font(REGULAR).fontSize(size);
  const lineGap = lineHeight - doc.currentLineHeight();
  for (const [i, line] of noteLines(s.notes).entries()) {
    const blockHeight = counts[i] * lineHeight;
    // 字を下限まで小さくしても入らない分は出さない（上限を設ける前に保存した備考など）
    if (y + blockHeight > bottom + lineGap) break;
    doc.text(line, x, y, { width: NOTES_WIDTH, lineGap });
    y += blockHeight;
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
