// @vitest-environment node
import { expect, test } from "vitest";
import { notesLinesError } from "./notes";

const message = "備考は5行以内（PDFで折り返した行を含む）で入力してください";

test("改行と折り返しを含めて5行までなら OK", () => {
  expect(notesLinesError(null)).toBeNull();
  expect(notesLinesError("1\n2\n3\n4\n5")).toBeNull();
  // 1 行に収まらない長さ（2 行）+ 3 行 = 5 行
  expect(notesLinesError(`${"あ".repeat(80)}\n3\n4\n5`)).toBeNull();
});

test("6行以上はエラー（折り返した行も数える）", () => {
  expect(notesLinesError("1\n2\n3\n4\n5\n6")).toBe(message);
  expect(notesLinesError(`${"あ".repeat(80)}\n3\n4\n5\n6`)).toBe(message);
});
