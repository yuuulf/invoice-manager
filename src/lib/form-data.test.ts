import { expect, test } from "vitest";
import { getText, isOneOf } from "./form-data";

test("getText は前後の空白を除き、未入力やファイルは空文字にする", () => {
  const fd = new FormData();
  fd.set("name", "  山田  ");
  fd.set("file", new File(["x"], "a.png"));
  expect(getText(fd, "name")).toBe("山田");
  expect(getText(fd, "missing")).toBe("");
  expect(getText(fd, "file")).toBe("");
});

test("isOneOf は選択肢に含まれるかを判定する", () => {
  expect(isOneOf(["a", "b"] as const, "a")).toBe(true);
  expect(isOneOf(["a", "b"] as const, "c")).toBe(false);
});
