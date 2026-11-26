import { expect, test } from "vitest";
import { isPng } from "./seal";

test("PNG のシグネチャで始まるデータだけを PNG と判定する", () => {
  expect(
    isPng(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])),
  ).toBe(true);
  expect(isPng(new TextEncoder().encode("GIF89a"))).toBe(false);
  expect(isPng(new Uint8Array())).toBe(false);
});
