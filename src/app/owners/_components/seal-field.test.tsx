import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { SEAL_MAX_BYTES } from "@/lib/owners/seal";
import { SealField } from "./seal-field";

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const fileInput = () => screen.getByLabelText("データ印") as HTMLInputElement;

test("未登録なら「未登録」と表示し、削除のチェックは出さない", () => {
  render(<SealField />);
  expect(screen.getByText("未登録")).toBeInTheDocument();
  expect(
    screen.queryByRole("checkbox", { name: "データ印を削除" }),
  ).not.toBeInTheDocument();
  expect(fileInput()).toHaveAttribute("accept", "image/png");
});

test("登録済みなら画像を表示し、削除にチェックすると表示を消す", async () => {
  render(<SealField currentSealUrl="/owners/1/seal" />);
  expect(screen.getByRole("img", { name: "データ印" })).toHaveAttribute(
    "src",
    "/owners/1/seal",
  );
  await userEvent.click(
    screen.getByRole("checkbox", { name: "データ印を削除" }),
  );
  expect(
    screen.queryByRole("img", { name: "データ印" }),
  ).not.toBeInTheDocument();
});

test("PNG を選ぶとプレビューを表示する", async () => {
  render(<SealField />);
  await userEvent.upload(
    fileInput(),
    new File(["x"], "seal.png", { type: "image/png" }),
  );
  expect(screen.getByRole("img", { name: "データ印" })).toHaveAttribute(
    "src",
    "blob:preview",
  );
});

test("PNG 以外を選ぶとエラーにして選択を取り消す", async () => {
  render(<SealField />);
  await userEvent.upload(
    fileInput(),
    new File(["x"], "seal.jpg", { type: "image/jpeg" }),
    { applyAccept: false },
  );
  expect(
    screen.getByText("データ印はPNG画像を選択してください"),
  ).toBeInTheDocument();
  expect(fileInput().value).toBe("");
  expect(fileInput()).toBeInvalid();
});

test("1MB を超えるファイルを選ぶとエラーにする", async () => {
  render(<SealField />);
  await userEvent.upload(
    fileInput(),
    new File([new Uint8Array(SEAL_MAX_BYTES + 1)], "big.png", {
      type: "image/png",
    }),
  );
  expect(
    screen.getByText("データ印は1MB以下の画像を選択してください"),
  ).toBeInTheDocument();
});

test("サーバーから返ったエラーを表示する", () => {
  render(<SealField error="データ印はPNG画像を選択してください" />);
  expect(fileInput()).toHaveAccessibleDescription(
    "PNG画像、1MBまで データ印はPNG画像を選択してください",
  );
});
