import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import type { LedgerDetail } from "@/lib/ledger/repository";
import { LedgerForm } from "./ledger-form";

const entry: LedgerDetail = {
  id: 3,
  invoiceNumber: "INV-ABC-202611-001",
  clientName: "サンプル産業株式会社",
  subject: "Webサイト保守・改修",
  issueDate: "2026-11-30",
  total: 134000,
  confirmedAt: new Date(2026, 11, 1, 10, 0),
  sentOn: null,
  paidOn: null,
  sentFileUrl: null,
  memo: null,
  ownerName: "やまだデザイン（山田 太郎）",
  dueDate: "2026-12-31",
};

function renderForm(overrides: Partial<LedgerDetail> = {}, action = vi.fn()) {
  render(
    <LedgerForm
      action={action}
      entry={{ ...entry, ...overrides }}
      today="2026-12-05"
    />,
  );
}

test("確定した内容は表示だけで、入力欄にしない", () => {
  renderForm();
  const terms = screen.getAllByRole("term").map((dt) => dt.textContent);
  expect(terms).toEqual([
    "請求書番号",
    "取引先",
    "事業主",
    "件名",
    "請求日",
    "合計",
    "支払い期限",
    "確定日",
  ]);
  for (const text of [
    "INV-ABC-202611-001",
    "サンプル産業株式会社",
    "やまだデザイン（山田 太郎）",
    "Webサイト保守・改修",
    "134,000",
    "2026-12-31",
    "2026-12-01",
  ]) {
    expect(screen.getByText(text)).toBeInTheDocument();
  }
  expect(screen.getAllByRole("textbox")).toHaveLength(1); // 備考だけ
  expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
});

test("未送信では日付の欄を出さず、状態を進めると今日の日付が入る", async () => {
  renderForm();
  expect(screen.getByRole("radio", { name: "未送信" })).toBeChecked();
  expect(screen.queryByLabelText(/送信日/)).not.toBeInTheDocument();

  await userEvent.click(
    screen.getByRole("radio", { name: "送信済み（未入金）" }),
  );
  expect(screen.getByLabelText(/送信日/)).toHaveValue("2026-12-05");
  expect(screen.queryByLabelText(/入金日/)).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("radio", { name: "入金済み" }));
  expect(screen.getByLabelText(/送信日/)).toHaveValue("2026-12-05");
  expect(screen.getByLabelText(/入金日/)).toHaveValue("2026-12-05");
});

test("記録済みの日付と備考を表示し、状態を進めても記録済みの日付は変えない", async () => {
  renderForm({ sentOn: "2026-11-30", memo: "メールで送付" });
  expect(
    screen.getByRole("radio", { name: "送信済み（未入金）" }),
  ).toBeChecked();
  expect(screen.getByRole("textbox", { name: "備考" })).toHaveValue(
    "メールで送付",
  );
  await userEvent.click(screen.getByRole("radio", { name: "入金済み" }));
  expect(screen.getByLabelText(/送信日/)).toHaveValue("2026-11-30");
  expect(screen.getByLabelText(/入金日/)).toHaveValue("2026-12-05");
});

test("送信すると入力内容をアクションに渡し、返ってきたエラーを表示する", async () => {
  const action = vi.fn(async (_state: unknown, formData: FormData) => ({
    errors: { paidOn: "入金日は送信日以降の日付を入力してください" },
    values: {
      status: String(formData.get("status")),
      sentOn: String(formData.get("sentOn")),
      paidOn: "2026-11-01",
      memo: "",
    },
  }));
  renderForm({ sentOn: "2026-11-30", paidOn: "2026-12-25" }, action);
  await userEvent.click(screen.getByRole("button", { name: "保存" }));

  const formData = action.mock.calls[0][1];
  expect(formData.get("id")).toBe("3");
  expect(formData.get("status")).toBe("paid");
  expect(
    await screen.findByText("入金日は送信日以降の日付を入力してください"),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/入金日/)).toHaveValue("2026-11-01");
});

test("左に確定した内容と備考、右に送信・入金を並べる", () => {
  renderForm();
  const columns = screen.getByTestId("form-columns");
  expect(columns.children).toHaveLength(2);
  const [left, right] = Array.from(columns.children);
  const memo = screen.getByRole("group", { name: "備考" });
  expect(left).toHaveTextContent("確定した内容");
  expect(left).toContainElement(memo);
  expect(
    screen
      .getByRole("heading", { name: "確定した内容" })
      .compareDocumentPosition(memo),
  ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(right).toContainElement(
    screen.getByRole("group", { name: "送信・入金" }),
  );
});

test("送信済みなら送信ファイルを入力でき、右の「開く」で新しいタブで開ける", async () => {
  renderForm();
  expect(
    screen.queryByRole("textbox", { name: "送信ファイル" }),
  ).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("radio", { name: "送信済み（未入金）" }),
  );
  const input = screen.getByRole("textbox", { name: "送信ファイル" });
  expect(input).toHaveAttribute("type", "url");
  expect(input).not.toBeRequired();

  // 正しい URL を入れるまでは押せない
  const disabled = screen.getByRole("link", { name: /送信ファイルを開く/ });
  expect(disabled).toHaveAttribute("aria-disabled", "true");
  expect(disabled).not.toHaveAttribute("href");
  expect(disabled).toHaveTextContent("開く");

  await userEvent.type(input, "https://drive.google.com/file/d/abc/view");
  const open = screen.getByRole("link", { name: /送信ファイルを開く/ });
  expect(open).toHaveAttribute(
    "href",
    "https://drive.google.com/file/d/abc/view",
  );
  expect(open).toHaveAttribute("target", "_blank");
  expect(open).toHaveTextContent("開く");
  expect(open).toHaveAttribute("title", "drive.google.com を開く");
  expect(input.compareDocumentPosition(open)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
});
