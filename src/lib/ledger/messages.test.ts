import { expect, test } from "vitest";
import { renumberedMessage } from "./messages";

test("重複のときは、その番号がすでに台帳にあると伝える", () => {
  expect(
    renumberedMessage({
      from: "IABC-202611-004",
      to: "IABC-202611-005",
      reason: "duplicate",
    }),
  ).toBe(
    "請求番号 IABC-202611-004 はすでに台帳にあるため、IABC-202611-005 に振り直しました。プレビューを確認して、もう一度発行してください。",
  );
});

test("空きがあるときは、変更前と変更後を伝える", () => {
  expect(
    renumberedMessage({
      from: "IABC-202611-003",
      to: "IABC-202611-002",
      reason: "gap",
    }),
  ).toBe(
    "台帳の番号に空きがあるため、請求番号を IABC-202611-003 から IABC-202611-002 に振り直しました。プレビューを確認して、もう一度発行してください。",
  );
});

test("それ以外は、台帳の連番に合わせたと伝える", () => {
  expect(
    renumberedMessage({
      from: "IABC-202611-001",
      to: "IABC-202611-003",
      reason: "behind",
    }),
  ).toBe(
    "台帳の連番に合わせて、請求番号を IABC-202611-001 から IABC-202611-003 に振り直しました。プレビューを確認して、もう一度発行してください。",
  );
});
