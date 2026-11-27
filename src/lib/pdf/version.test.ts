// @vitest-environment node
import { expect, test } from "vitest";
import { sampleSnapshot } from "./test-snapshot";
import { pdfVersion } from "./version";

test("同じ内容なら同じ値", () => {
  expect(pdfVersion(sampleSnapshot, null)).toBe(
    pdfVersion(structuredClone(sampleSnapshot), null),
  );
});

test("請求書・取引先・事業主・データ印のどれかが変わると値が変わる", () => {
  const base = pdfVersion(sampleSnapshot, null);
  const changed = [
    pdfVersion({ ...sampleSnapshot, subject: "別の件名" }, null),
    pdfVersion(
      {
        ...sampleSnapshot,
        client: { ...sampleSnapshot.client, name: "別の会社" },
      },
      null,
    ),
    pdfVersion(
      { ...sampleSnapshot, owner: { ...sampleSnapshot.owner, phone: "0" } },
      null,
    ),
    pdfVersion(sampleSnapshot, Buffer.from("seal")),
  ];
  for (const version of changed) expect(version).not.toBe(base);
});
