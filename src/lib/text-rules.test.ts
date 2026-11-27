import { expect, test } from "vitest";
import {
  digitsOnly,
  exceeds,
  maxLengthMessage,
  upperAlphanumericOnly,
} from "./text-rules";

test("文字数はサロゲートペアも1文字と数える", () => {
  expect(exceeds("あ".repeat(20), 20)).toBe(false);
  expect(exceeds("あ".repeat(21), 20)).toBe(true);
  expect(exceeds("𠮷".repeat(20), 20)).toBe(false);
});

test("文字数の上限のメッセージ", () => {
  expect(maxLengthMessage("会社名", 40)).toBe(
    "会社名は40文字以内で入力してください",
  );
});

test("数字だけを残し、全角の数字は半角にする", () => {
  expect(digitsOnly("150-0001")).toBe("1500001");
  expect(digitsOnly("１２３a")).toBe("123");
});

test("英大文字・数字だけを残し、小文字・全角は変換する", () => {
  expect(upperAlphanumericOnly("a1-b")).toBe("A1B");
  expect(upperAlphanumericOnly("ＡＢ１")).toBe("AB1");
  expect(upperAlphanumericOnly("あA")).toBe("A");
});
