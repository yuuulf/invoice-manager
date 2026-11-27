// @vitest-environment node
import { expect, test } from "vitest";
import { fitInBox, fitText, wrapText } from "./fit-text";
import { createDocument } from "./render-invoice";

const doc = createDocument("test");
const FONT = "NotoSansJP-Regular";
const base = { font: FONT, size: 10, minSize: 7, lineFactor: 1.5 };

test("入るならふつうの大きさのまま1行", () => {
  const f = fitText(doc, "短い文字", { ...base, width: 200 });
  expect(f).toMatchObject({ size: 10, lines: ["短い文字"] });
});

test("入らなければ字を小さくして1行に収める", () => {
  // 10pt で 20 文字 = 200pt、8pt なら 160pt
  const f = fitText(doc, "あ".repeat(20), { ...base, width: 165 });
  expect(f.lines).toHaveLength(1);
  expect(f.size).toBeLessThan(10);
  expect(f.size).toBeGreaterThanOrEqual(7);
  expect(f.width).toBeLessThanOrEqual(165);
});

test("下限でも入らなければ下限の大きさで折り返す（省略しない）", () => {
  const value = "あ".repeat(40);
  const f = fitText(doc, value, { ...base, width: 100 });
  expect(f.size).toBe(7);
  expect(f.lines.join("")).toBe(value);
  expect(f.lines.length).toBeGreaterThan(1);
  expect(f.height).toBeCloseTo(7 * 1.5 * f.lines.length);
});

test("英数字の単語はなるべく途中で折り返さず、長すぎる語は文字ごとに折り返す", () => {
  doc.font(FONT).fontSize(10);
  expect(wrapText(doc, "abc defgh", doc.widthOfString("abc defg"))).toEqual([
    "abc",
    "defgh",
  ]);
  const long = "a".repeat(30);
  const lines = wrapText(doc, long, doc.widthOfString("a".repeat(10)));
  expect(lines.join("")).toBe(long);
  expect(lines).toHaveLength(3);
});

test("高さの決まった欄では、高さに入る大きさで折り返す", () => {
  const f = fitInBox(doc, "あ".repeat(40), {
    ...base,
    size: 9.5,
    lineFactor: 1.2,
    width: 200,
    height: 18,
  });
  expect(f.lines).toHaveLength(2);
  expect(f.height).toBeLessThanOrEqual(18);
  expect(f.size).toBeGreaterThanOrEqual(7);
});
