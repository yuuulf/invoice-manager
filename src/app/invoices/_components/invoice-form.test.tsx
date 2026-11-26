import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { InvoiceWithItems } from "@/lib/invoices/repository";
import { InvoiceForm, type ClientOption } from "./invoice-form";

const clients: ClientOption[] = [
  {
    id: 1,
    name: "サンプル産業株式会社",
    code: "ABC",
    paymentTermType: "next_month_end",
    paymentTermDay: null,
    rounding: "floor",
  },
  {
    id: 2,
    name: "テスト商事",
    code: "T01",
    paymentTermType: "next_month_day",
    paymentTermDay: 10,
    rounding: "ceil",
  },
];
const owners = [{ id: 9, label: "やまだデザイン（山田 太郎）" }];

afterEach(() => {
  vi.restoreAllMocks();
});

function renderNew(action = vi.fn()) {
  render(
    <InvoiceForm
      action={action}
      clients={clients}
      owners={owners}
      today="2026-11-30"
      mode="create"
    />,
  );
  return action;
}

const dueDate = () => screen.getByLabelText(/支払い期限/) as HTMLInputElement;
const setValue = (element: HTMLElement, value: string) =>
  fireEvent.change(element, { target: { value } });

async function chooseMonth(month: string) {
  await userEvent.click(screen.getByRole("radio", { name: "月" }));
  setValue(screen.getByLabelText("対象月"), month);
}

describe("作成", () => {
  test("請求日は今日、対象期間と支払い期限は未入力、明細は10行", () => {
    renderNew();
    expect(screen.getByLabelText(/請求日/)).toHaveValue("2026-11-30");
    expect(screen.getByRole("radio", { name: "月" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "期間" })).not.toBeChecked();
    expect(dueDate()).toHaveValue("");
    expect(screen.getAllByRole("textbox", { name: /行目の内容/ })).toHaveLength(
      10,
    );
    expect(screen.getByText("未採番")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
  });

  test("取引先の選択肢は「コード 会社名」", () => {
    renderNew();
    const select = screen.getByRole("combobox", { name: /取引先/ });
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual([
      "選択してください",
      "ABC サンプル産業株式会社",
      "T01 テスト商事",
    ]);
  });
});

describe("支払い期限の自動算出（spec.md 7.1）", () => {
  test("取引先と対象期間がそろうと算出し、取引先を変えると算出し直す", async () => {
    renderNew();
    await chooseMonth("2026-11");
    expect(dueDate()).toHaveValue("");

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /取引先/ }),
      "1",
    );
    expect(dueDate()).toHaveValue("2026-12-31");

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /取引先/ }),
      "2",
    );
    expect(dueDate()).toHaveValue("2026-12-10");
  });

  test("期間なら終了日の月を基準にする", async () => {
    renderNew();
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /取引先/ }),
      "1",
    );
    await userEvent.click(screen.getByRole("radio", { name: "期間" }));
    setValue(screen.getByLabelText("開始日"), "2026-11-01");
    setValue(screen.getByLabelText("終了日"), "2026-12-15");
    expect(dueDate()).toHaveValue("2027-01-31");
  });

  test("手動で変えたら上書きせず、「再計算」で算出した日に戻る", async () => {
    renderNew();
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /取引先/ }),
      "1",
    );
    await chooseMonth("2026-11");
    const recalc = screen.getByRole("button", { name: "再計算" });
    expect(recalc).toBeDisabled();

    setValue(dueDate(), "2027-01-05");
    expect(screen.getByText(/手動で変更しています/)).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /取引先/ }),
      "2",
    );
    expect(dueDate()).toHaveValue("2027-01-05");

    await userEvent.click(recalc);
    expect(dueDate()).toHaveValue("2026-12-10");
  });
});

describe("明細の金額と合計", () => {
  test("取引先を選ぶまでは計算しない。選ぶと取引先の端数処理で計算する", async () => {
    renderNew();
    await userEvent.type(
      screen.getByRole("textbox", { name: "1行目の数量" }),
      "1.25",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "1行目の単価" }),
      "333",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "2行目の数量" }),
      "3",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "2行目の単価" }),
      "8000",
    );
    expect(screen.getByLabelText("合計")).toHaveTextContent("—");
    expect(
      screen.getByText(
        "取引先を選択すると金額と合計を計算します。最大10行です。",
      ),
    ).toBeInTheDocument();

    const clientSelect = screen.getByRole("combobox", { name: /取引先/ });
    await userEvent.selectOptions(clientSelect, "1"); // 切り捨て
    expect(screen.getByLabelText("1行目の金額")).toHaveTextContent("416");
    expect(screen.getByLabelText("2行目の金額")).toHaveTextContent("24,000");
    expect(screen.getByLabelText("合計")).toHaveTextContent("24,416");
    expect(
      screen.getByText(
        "金額は数量×単価を取引先の端数処理（切り捨て）で計算します。最大10行です。",
      ),
    ).toBeInTheDocument();

    await userEvent.selectOptions(clientSelect, "2"); // 切り上げ
    expect(screen.getByLabelText("1行目の金額")).toHaveTextContent("417");
    expect(screen.getByLabelText("合計")).toHaveTextContent("24,417");
    expect(
      screen.getByText(
        "金額は数量×単価を取引先の端数処理（切り上げ）で計算します。最大10行です。",
      ),
    ).toBeInTheDocument();
  });
});

describe("送信", () => {
  test("入力内容と手動変更の有無をアクションに渡す", async () => {
    const action = renderNew();
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /取引先/ }),
      "1",
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /事業主/ }),
      "9",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: /件名/ }),
      "Webサイト保守",
    );
    await chooseMonth("2026-11");
    await userEvent.type(
      screen.getByRole("textbox", { name: "1行目の内容" }),
      "保守",
    );
    await userEvent.click(screen.getByRole("button", { name: "作成" }));

    const formData: FormData = action.mock.calls[0][1];
    expect(Object.fromEntries(formData)).toMatchObject({
      clientId: "1",
      ownerId: "9",
      issueDate: "2026-11-30",
      subject: "Webサイト保守",
      periodType: "month",
      periodMonth: "2026-11",
      dueDate: "2026-12-31",
      dueDateManual: "false",
      "items.0.description": "保守",
    });
  });

  test("返ってきたエラーを表示し、入力値を保つ", async () => {
    const action = vi.fn(async (_state: unknown, formData: FormData) => ({
      errors: {
        "items.0.quantity":
          "数量は0以上の数値（小数第2位まで）で入力してください",
      },
      values: {
        clientId: "",
        ownerId: "",
        issueDate: "2026-11-30",
        subject: String(formData.get("subject")),
        periodType: "",
        periodMonth: "",
        periodStart: "",
        periodEnd: "",
        dueDate: "",
        dueDateManual: false,
        notes: "",
        items: Array.from({ length: 10 }, (_, i) => ({
          description: "",
          quantity: i === 0 ? "abc" : "",
          unit: "",
          unitPrice: "",
        })),
      },
    }));
    renderNew(action);
    await userEvent.type(
      screen.getByRole("textbox", { name: /件名/ }),
      "件名A",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "1行目の数量" }),
      "abc",
    );
    await userEvent.click(screen.getByRole("button", { name: "作成" }));

    const quantity = await screen.findByRole("textbox", {
      name: "1行目の数量",
    });
    expect(quantity).toHaveValue("abc");
    expect(quantity).toBeInvalid();
    expect(quantity).toHaveAccessibleDescription(
      "数量は0以上の数値（小数第2位まで）で入力してください",
    );
    expect(screen.getByRole("textbox", { name: /件名/ })).toHaveValue("件名A");
  });
});

test("編集では保存済みの内容と請求番号を表示する", () => {
  const invoice: InvoiceWithItems = {
    id: 5,
    clientId: 1,
    ownerId: 9,
    invoiceNumber: "IABC-202611-001",
    issueDate: "2026-11-30",
    subject: "Webサイト保守・改修",
    periodType: "month",
    periodMonth: "2026-11",
    periodStart: null,
    periodEnd: null,
    dueDate: "2027-01-05",
    dueDateManual: true,
    notes: "いつもお世話になっております。",
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 1,
        invoiceId: 5,
        position: 2,
        description: "LP改修作業",
        quantity: 1200,
        unit: "時間",
        unitPrice: 5000,
      },
    ],
  };
  render(
    <InvoiceForm
      action={vi.fn()}
      invoice={invoice}
      clients={clients}
      owners={owners}
      today="2026-12-01"
      mode="edit"
    />,
  );
  expect(screen.getByText("IABC-202611-001")).toBeInTheDocument();
  expect(screen.getByLabelText(/請求日/)).toHaveValue("2026-11-30");
  expect(screen.getByLabelText("対象月")).toHaveValue("2026-11");
  expect(dueDate()).toHaveValue("2027-01-05");
  expect(screen.getByRole("textbox", { name: "3行目の内容" })).toHaveValue(
    "LP改修作業",
  );
  expect(screen.getByRole("textbox", { name: "3行目の数量" })).toHaveValue(
    "12",
  );
  expect(screen.getByLabelText("3行目の金額")).toHaveTextContent("60,000");
  expect(screen.getByRole("textbox", { name: "備考" })).toHaveValue(
    "いつもお世話になっております。",
  );
  expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
});

describe("PDF 出力と確定（spec.md 7.4）", () => {
  test("確定のチェックで説明とボタンの文言が変わる", async () => {
    renderNew();
    expect(
      screen.getByText(/「SAMPLE」の透かしが入ります/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "確定する" }));
    expect(screen.getByText(/台帳に記録され/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "確定してPDF出力" }),
    ).toBeInTheDocument();
  });

  test("PDF出力は intent=output で送信する", async () => {
    const action = renderNew();
    await userEvent.click(screen.getByRole("button", { name: "PDF出力" }));
    const formData: FormData = action.mock.calls[0][1];
    expect(formData.get("intent")).toBe("output");
    expect(formData.get("confirm")).toBeNull();
  });

  test("保存ボタンでは intent を送らない", async () => {
    const action = renderNew();
    await userEvent.click(screen.getByRole("button", { name: "作成" }));
    expect(action.mock.calls[0][1].get("intent")).toBeNull();
  });

  test("確定して出力するときは確認し、キャンセルなら送信しない", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    const action = renderNew();
    await userEvent.click(screen.getByRole("checkbox", { name: "確定する" }));
    await userEvent.click(
      screen.getByRole("button", { name: "確定してPDF出力" }),
    );
    expect(confirm).toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    await userEvent.click(
      screen.getByRole("button", { name: "確定してPDF出力" }),
    );
    expect(action.mock.calls[0][1].get("confirm")).toBe("on");
  });

  test("出力できなかったらメッセージと、振り直した請求番号を表示する", async () => {
    renderNew(
      vi.fn(async (_state: unknown, formData: FormData) => ({
        errors: {},
        values: {
          clientId: "",
          ownerId: "",
          issueDate: "2026-11-30",
          subject: String(formData.get("subject")),
          periodType: "",
          periodMonth: "",
          periodStart: "",
          periodEnd: "",
          dueDate: "",
          dueDateManual: false,
          notes: "",
          items: Array.from({ length: 10 }, () => ({
            description: "",
            quantity: "",
            unit: "",
            unitPrice: "",
          })),
        },
        invoiceNumber: "IABC-202611-002",
        message:
          "請求番号が台帳と重複するため IABC-202611-002 に振り直しました",
      })),
    );
    await userEvent.click(screen.getByRole("button", { name: "PDF出力" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "振り直しました",
    );
    expect(screen.getByText("IABC-202611-002")).toBeInTheDocument();
  });
});
