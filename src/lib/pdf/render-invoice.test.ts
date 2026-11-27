// @vitest-environment node
import { describe, expect, test } from "vitest";
import type { InvoiceSnapshot } from "@/lib/invoices/snapshot";
import {
  createDocument,
  fitCell,
  layoutOwnerBlock,
  lowerGaps,
  layoutRecipientBlock,
  layoutNotes,
  renderInvoicePdf,
} from "./render-invoice";
import { sampleSnapshot } from "./test-snapshot";

const mm = (value: number) => value * 2.8346;

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
  "base64",
);

test("A4 1ページの PDF を作る", async () => {
  const pdf = await renderInvoicePdf(sampleSnapshot, {
    sample: false,
    seal: png,
  });
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  const body = pdf.toString("latin1");
  expect(body.match(/\/Type \/Page\b/g)).toHaveLength(1);
  expect(body).toContain("/MediaBox [0 0 595.28 841.89]");
  expect(body).toContain("/Subtype /Image");
});

test("データ印がなければ画像を入れない", async () => {
  const pdf = await renderInvoicePdf(sampleSnapshot, {
    sample: false,
    seal: null,
  });
  expect(pdf.toString("latin1")).not.toContain("/Subtype /Image");
});

test("確定前（sample）は透かしの分だけ内容が増える", async () => {
  const [confirmed, sample] = await Promise.all([
    renderInvoicePdf(sampleSnapshot, { sample: false, seal: null }),
    renderInvoicePdf(sampleSnapshot, { sample: true, seal: null }),
  ]);
  expect(sample.toString("latin1")).toContain("/ca 0.12");
  expect(confirmed.toString("latin1")).not.toContain("/ca 0.12");
});

describe("上段・左の配置（件名が長いとき）", () => {
  const longSubject = {
    ...sampleSnapshot,
    subject: "Webサイト保守・改修およびランディングページ制作",
    period: { type: "range", start: "2026-11-01", end: "2026-11-30" },
  } satisfies InvoiceSnapshot;
  const veryLongSubject = {
    ...longSubject,
    subject:
      "Webサイト保守・改修およびランディングページ制作とバナー画像制作一式、アクセス解析レポート作成",
  } satisfies InvoiceSnapshot;
  const layout = (s: InvoiceSnapshot) =>
    layoutRecipientBlock(createDocument("test"), s);

  test("件名が1行なら、リード文・ご請求金額は従来の位置", () => {
    const short = layout(sampleSnapshot);
    expect(short.subjectLines).toBe(1);
    expect(short.leadY).toBeCloseTo(short.subjectY + mm(8));
    expect(short.amountY).toBeCloseTo(mm(83));
  });

  test("件名が2行になったら、リード文を1行分下げて重ねない", () => {
    const short = layout(sampleSnapshot);
    const long = layout(longSubject);
    expect(long.subjectLines).toBe(2);
    expect(long.leadY).toBeGreaterThanOrEqual(
      long.subjectY + long.subjectLineHeight * 2,
    );
    expect(long.leadY - short.leadY).toBeCloseTo(long.subjectLineHeight);
  });

  test("3行以上になる件名も省略せずに折り返し、ご請求金額・明細をその分下げる", () => {
    const s = {
      ...veryLongSubject,
      client: { ...veryLongSubject.client, contactName: "佐藤 花子" },
    };
    const l = layout(s);
    expect(l.subjectLines).toBeGreaterThanOrEqual(3);
    expect(l.leadY).toBeGreaterThanOrEqual(
      l.subjectY + l.subjectLineHeight * l.subjectLines,
    );
    expect(l.amountY).toBeGreaterThanOrEqual(l.leadY + mm(10));
    // 明細はご請求金額の下線より下から始める
    expect(l.itemsTop).toBeGreaterThan(l.amountUnderlineY);
    expect(l.itemsTop).toBeGreaterThan(mm(100));
  });

  test("件名が短ければ明細は従来の位置（100mm）", () => {
    expect(layout(sampleSnapshot).itemsTop).toBeCloseTo(mm(100));
    expect(layout(longSubject).itemsTop).toBeCloseTo(mm(100));
  });

  test("上限（34文字）の件名は、記号や英単語が混ざっても期間込みで3行に収まる", () => {
    const subjects = [
      "あ".repeat(34),
      "（「漢」）、。・ー".repeat(5).slice(0, 34),
      "Web maintenance・改修（LP）、バナー制作一式と解析",
      "maintenance".repeat(4).slice(0, 34),
      "W".repeat(34),
    ];
    for (const subject of subjects) {
      expect([...subject].length).toBeLessThanOrEqual(34);
      expect(
        layout({ ...longSubject, subject }).subjectLines,
      ).toBeLessThanOrEqual(3);
    }
  });
});

describe("備考欄（spec.md 7.1, 8.4）", () => {
  test("上限の250文字（改行なし）は、いちばん狭い備考欄（税込・宛名2行・件名3行・手数料の行あり）にも入る", () => {
    const layout = layoutNotes(
      createDocument("test"),
      "あ".repeat(250),
      mm(27.4),
    );
    expect(layout.fits).toBe(true);
    expect(layout.size).toBeGreaterThanOrEqual(6.5);
  });

  test.each([
    ["全角50文字×5行", "あ".repeat(50)],
    ["半角100文字×5行（幅の広い W）", "W".repeat(100)],
    ["半角100文字×5行（数字）", "1".repeat(100)],
  ])("上限いっぱい（%s）でも、いちばん狭い備考欄に入る", (_, line) => {
    const notes = Array.from({ length: 5 }, () => line).join("\n");
    const layout = layoutNotes(createDocument("test"), notes, mm(27.4));
    expect(layout.fits).toBe(true);
    expect(layout.size).toBeGreaterThanOrEqual(5);
  });

  test("欄に入るなら通常の大きさ（9.5pt、行の高さ 1.8 倍）", () => {
    const layout = layoutNotes(createDocument("test"), "1\n2\n3\n4\n5", mm(45));
    expect(layout).toMatchObject({ size: 9.5, fits: true });
    expect(layout.lineHeight).toBeCloseTo(9.5 * 1.8);
  });

  test("欄が狭くて入らなければ、行間を詰めてから字を小さくし、5行を入れる", () => {
    // 税込・宛名 2 行・件名 3 行・手数料の行ありのときの備考欄の高さ
    const layout = layoutNotes(
      createDocument("test"),
      "1\n2\n3\n4\n5",
      mm(27.4),
    );
    expect(layout.fits).toBe(true);
    expect(layout.size).toBeLessThan(9.5);
    expect(layout.size).toBeGreaterThanOrEqual(6.5);
    expect(mm(3) * 2 + layout.lineHeight * 6).toBeLessThanOrEqual(mm(27.4));
  });

  test("備考が短ければ、欄が狭くても字は小さくしない", () => {
    expect(layoutNotes(createDocument("test"), "1\n2", mm(27.4)).size).toBe(
      9.5,
    );
  });
});

describe("入りきらない文字（spec.md 8.3）", () => {
  const z = (n: number) => "漢".repeat(n);
  const doc = createDocument("test");

  test("明細のマスは、上限の長さでも字を小さく・折り返して行の高さに収める", () => {
    const cases: [string, number][] = [
      [z(60), mm(178 - 76)], // 内容 60 文字
      [`9999999.99 ${z(5)}`, mm(24)], // 数量 10 文字 + 単位 5 文字
      ["9,999,999,999", mm(24)], // 単価 10 桁
      ["9,999,999,999", mm(28)], // 金額 10 桁
    ];
    for (const [value, width] of cases) {
      const f = fitCell(doc, value, width);
      expect(f.lines.join("").replace(/\s/g, "")).toBe(
        value.replace(/\s/g, ""),
      );
      expect(f.size).toBeGreaterThanOrEqual(7);
      expect(f.height).toBeLessThanOrEqual(mm(7.2) - mm(1));
    }
  });

  test("ふつうの長さなら明細は 9.5pt のまま", () => {
    expect(fitCell(doc, "Webサイト保守（11月分）", mm(102)).size).toBe(9.5);
  });

  test("宛名が長いときは 9pt まで小さくし、それでも入らなければ折り返す", () => {
    const layout = layoutRecipientBlock(doc, {
      ...sampleSnapshot,
      client: {
        ...sampleSnapshot.client,
        name: z(40),
        department: z(20),
        contactName: z(20),
      },
    });
    const [company, contact] = layout.recipient;
    expect(company.size).toBe(9);
    expect(company.lines.length).toBeGreaterThan(1);
    expect(contact.size).toBeGreaterThanOrEqual(9);
    // 宛名が下がった分、件名も下がる
    expect(layout.subjectY).toBeGreaterThan(
      layoutRecipientBlock(doc, sampleSnapshot).subjectY,
    );
  });

  test("事業主情報: ふつうは今の位置、長い項目があると左に広げ、データ印と重ねない", () => {
    const normal = layoutOwnerBlock(doc, sampleSnapshot, true);
    expect(normal.x).toBeCloseTo(mm(144));
    expect(normal.entries.every((e) => e.fitted.size >= 9)).toBe(true);

    const long = layoutOwnerBlock(
      doc,
      {
        ...sampleSnapshot,
        owner: {
          ...sampleSnapshot.owner,
          tradeName: z(20),
          name: z(20),
          address1: z(20),
          address2: z(20),
          email: `${"a".repeat(64)}@${"b".repeat(176)}.example.com`,
        },
      },
      true,
    );
    expect(long.x).toBeLessThan(mm(144));
    expect(long.x).toBeGreaterThanOrEqual(mm(118));
    for (const { fitted, y } of long.entries) {
      expect(fitted.size).toBeGreaterThanOrEqual(7);
      // データ印（右端から 20mm、上端 45〜65mm）の横の行は、データ印の手前まで
      if (y < mm(65)) {
        expect(long.x + fitted.width).toBeLessThanOrEqual(mm(194 - 22) + 0.01);
      }
    }
    expect(long.bottom).toBeGreaterThan(normal.bottom);
  });

  test("下段の間隔はふつう 12mm・8mm。備考が下限の大きさでも入らないときだけ詰める", () => {
    expect(lowerGaps(doc, sampleSnapshot, mm(194))).toEqual({
      beforePayment: mm(12),
      beforeNotes: mm(8),
    });
    const crowded = {
      ...sampleSnapshot,
      notes: Array.from({ length: 5 }, () => z(50)).join("\n"),
    };
    expect(lowerGaps(doc, crowded, mm(232))).toEqual({
      beforePayment: mm(6),
      beforeNotes: mm(4),
    });
  });
});
