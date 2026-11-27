import { expect, test } from "vitest";
import { ownerDisplayName } from "./labels";

test("屋号があれば「屋号（氏名）」、なければ氏名", () => {
  expect(
    ownerDisplayName({ name: "山田 太郎", tradeName: "やまだデザイン" }),
  ).toBe("やまだデザイン（山田 太郎）");
  expect(ownerDisplayName({ name: "山田 太郎", tradeName: null })).toBe(
    "山田 太郎",
  );
});
