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

  test("件名は34文字を超えても入力でき、フォーカスアウトでエラー。上限は注釈で示す", async () => {
    renderNew();
    const subject = screen.getByRole("textbox", { name: /件名/ });
    expect(subject).not.toHaveAttribute("maxLength");
    expect(subject).toHaveAccessibleDescription("34文字以内");
    await userEvent.type(subject, "あ".repeat(35));
    await userEvent.tab();
    expect(subject).toHaveAccessibleDescription(
      "34文字以内 件名は34文字以内で入力してください",
    );
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

describe("消費税（税抜・税込）", () => {
  async function fillOneRow(unitPrice: string) {
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /取引先/ }),
      "2", // 切り上げ
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "1行目の数量" }),
      "1",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "1行目の単価" }),
      unitPrice,
    );
  }

  test("作成時は税抜。合計欄は合計だけ", async () => {
    renderNew();
    expect(screen.getByRole("radio", { name: "税抜" })).toBeChecked();
    await fillOneRow("1235");
    expect(screen.getByLabelText("合計")).toHaveTextContent("1,235");
    expect(screen.queryByLabelText("小計（税抜）")).not.toBeInTheDocument();
  });

  test("税込にすると小計（税抜）・消費税相当額（10%）・合計を表示する（端数は取引先の端数処理）", async () => {
    renderNew();
    await fillOneRow("1235");
    await userEvent.click(screen.getByRole("radio", { name: "税込" }));
    expect(screen.getByLabelText("小計（税抜）")).toHaveTextContent("1,235");
    // 123.5 → 切り上げ 124
    expect(screen.getByLabelText("消費税相当額（10%）")).toHaveTextContent(
      "124",
    );
    expect(screen.getByLabelText("合計")).toHaveTextContent("1,359");
    expect(
      screen.getByText(
        "金額は数量×単価を取引先の端数処理（切り上げ）で計算します。消費税相当額も小計の10%を同じ端数処理で計算します。最大10行です。",
      ),
    ).toBeInTheDocument();
  });

  test("選んだ消費税をアクションに渡す", async () => {
    const action = renderNew();
    await userEvent.click(screen.getByRole("radio", { name: "税込" }));
    await userEvent.click(screen.getByRole("button", { name: "作成" }));
    const formData: FormData = action.mock.calls[0][1];
    expect(formData.get("taxMode")).toBe("included");
  });
});

describe("備考", () => {
  test("1行50文字で折り返して5行までと注釈を出し、全角50文字＋半角1文字の幅で折り返す", () => {
    renderNew();
    const notes = screen.getByRole("textbox", { name: "備考" });
    expect(notes).toHaveAccessibleDescription(
      "1行50文字（半角は0.5文字）で折り返して5行まで",
    );
    expect(notes.getAttribute("style")).toContain("50.5em");
  });
});

describe("文字数の上限とフォーカスアウトのチェック", () => {
  test("明細は上限を超えても入力でき、フォーカスアウトでエラー", async () => {
    renderNew();
    const cases: [string, string, string][] = [
      ["1行目の内容", "あ".repeat(61), "内容は60文字以内で入力してください"],
      [
        "1行目の数量",
        "1".repeat(11),
        "数量は10文字以内（小数点を含む）で入力してください",
      ],
      ["1行目の単位", "あ".repeat(6), "単位は5文字以内で入力してください"],
      ["1行目の単価", "1".repeat(11), "単価は10桁以内で入力してください"],
    ];
    for (const [name, typed, message] of cases) {
      const input = screen.getByRole("textbox", { name });
      expect(input).not.toHaveAttribute("maxLength");
      fireEvent.change(input, { target: { value: typed } });
      fireEvent.blur(input);
      expect(input).toHaveValue(typed);
      expect(input).toHaveAccessibleDescription(message);
    }
  });

  test("フォーカスアウトで形式をチェックし、直したら消す", async () => {
    renderNew();
    const quantity = screen.getByRole("textbox", { name: "1行目の数量" });
    await userEvent.type(quantity, "1.234");
    await userEvent.tab();
    expect(quantity).toHaveAccessibleDescription(
      "数量は0以上の数値（小数第2位まで）で入力してください",
    );
    await userEvent.clear(quantity);
    await userEvent.type(quantity, "1.5");
    await userEvent.tab();
    expect(quantity).toBeValid();
  });

  test("未入力はフォーカスアウトではエラーにしない（必須はPDF出力時）", async () => {
    renderNew();
    const subject = screen.getByRole("textbox", { name: /件名/ });
    await userEvent.click(subject);
    await userEvent.tab();
    expect(subject).not.toHaveAttribute("aria-invalid");
  });

  test("備考は5行を超えるとフォーカスアウトでエラー", async () => {
    renderNew();
    const notes = screen.getByRole("textbox", { name: "備考" });
    fireEvent.change(notes, { target: { value: "1\n2\n3\n4\n5\n6" } });
    fireEvent.blur(notes);
    expect(notes).toHaveAccessibleDescription(
      "1行50文字（半角は0.5文字）で折り返して5行まで 備考は1行50文字で折り返して5行以内で入力してください",
    );
  });
});

describe("金額・合計の上限（10桁）", () => {
  test("合計が10桁を超えると明細の下にエラーを表示する", async () => {
    renderNew();
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /取引先/ }),
      "1",
    );
    for (const row of [1, 2]) {
      fireEvent.change(
        screen.getByRole("textbox", { name: `${row}行目の数量` }),
        { target: { value: "1" } },
      );
      fireEvent.change(
        screen.getByRole("textbox", { name: `${row}行目の単価` }),
        { target: { value: "5000000000" } },
      );
    }
    expect(
      screen.getByText("合計は10桁（9,999,999,999）以内にしてください"),
    ).toBeInTheDocument();
  });

  test("金額（数量×単価）が10桁を超えると単価の欄にエラー", async () => {
    renderNew();
    fireEvent.change(screen.getByRole("textbox", { name: "1行目の数量" }), {
      target: { value: "2" },
    });
    const unitPrice = screen.getByRole("textbox", { name: "1行目の単価" });
    fireEvent.change(unitPrice, { target: { value: "5000000000" } });
    fireEvent.blur(unitPrice);
    expect(unitPrice).toHaveAccessibleDescription(
      "金額（数量×単価）は10桁（9,999,999,999）以内にしてください",
    );
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

  test("エラーが返っても、選んだ取引先・事業主は選択されたまま", async () => {
    const action = vi.fn(async (_state: unknown, formData: FormData) => ({
      errors: {
        notes: "備考は5行以内（PDFで折り返した行を含む）で入力してください",
      },
      values: {
        clientId: String(formData.get("clientId")),
        ownerId: String(formData.get("ownerId")),
        issueDate: "2026-11-30",
        subject: "",
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
    }));
    renderNew(action);
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /取引先/ }),
      "2",
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /事業主/ }),
      "9",
    );
    await userEvent.click(screen.getByRole("button", { name: "作成" }));

    await screen.findByText(
      "備考は5行以内（PDFで折り返した行を含む）で入力してください",
    );
    expect(screen.getByRole("combobox", { name: /取引先/ })).toHaveValue("2");
    expect(screen.getByRole("combobox", { name: /事業主/ })).toHaveValue("9");
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
        taxMode: "excluded",
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

    // 送信前から同じ入力欄があるため、エラーが表示されるのを待ってから検査する
    await screen.findByText(
      "数量は0以上の数値（小数第2位まで）で入力してください",
    );
    const quantity = screen.getByRole("textbox", { name: "1行目の数量" });
    expect(quantity).toHaveValue("abc");
    expect(quantity).toBeInvalid();
    expect(quantity).toHaveAccessibleDescription(
      "数量は0以上の数値（小数第2位まで）で入力してください",
    );
    expect(screen.getByRole("textbox", { name: /件名/ })).toHaveValue("件名A");
  });
});

test("編集では保存済みの内容と請求書番号を表示する", () => {
  const invoice: InvoiceWithItems = {
    id: 5,
    clientId: 1,
    ownerId: 9,
    invoiceNumber: "INV-ABC-202611-001",
    issueDate: "2026-11-30",
    subject: "Webサイト保守・改修",
    periodType: "month",
    periodMonth: "2026-11",
    periodStart: null,
    periodEnd: null,
    dueDate: "2027-01-05",
    dueDateManual: true,
    notes: "いつもお世話になっております。",
    taxMode: "excluded",
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
  expect(screen.getByText("INV-ABC-202611-001")).toBeInTheDocument();
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

describe("PDF 出力（spec.md 7.4）", () => {
  test("PDF出力は intent=output で送信する。確定はプレビュー画面で行う", async () => {
    const action = renderNew();
    expect(
      screen.queryByRole("checkbox", { name: /確定/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/ダウンロードと確定はプレビュー画面で行います/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "PDF出力" }));
    expect(action.mock.calls[0][1].get("intent")).toBe("output");
  });

  test("保存ボタンでは intent を送らない", async () => {
    const action = renderNew();
    await userEvent.click(screen.getByRole("button", { name: "作成" }));
    expect(action.mock.calls[0][1].get("intent")).toBeNull();
  });

  test("出力できなかったらメッセージを表示する", async () => {
    renderNew(
      vi.fn(async (_state: unknown, formData: FormData) => ({
        errors: { subject: "件名を入力してください" },
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
          taxMode: "excluded",
          items: Array.from({ length: 10 }, () => ({
            description: "",
            quantity: "",
            unit: "",
            unitPrice: "",
          })),
        },
        message: "PDFを出力するには、必須項目をすべて入力してください",
      })),
    );
    await userEvent.click(screen.getByRole("button", { name: "PDF出力" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "PDFを出力するには、必須項目をすべて入力してください",
    );
    expect(
      screen.getByRole("textbox", { name: /件名/ }),
    ).toHaveAccessibleDescription("34文字以内 件名を入力してください");
  });
});

test("基本情報と対象期間・支払い期限を左右に並べ、明細以降は 1 列にする", () => {
  renderNew();
  const columns = screen.getByTestId("form-columns");
  const sections = Array.from(columns.children).map(
    (child) => child.querySelector("legend")?.textContent,
  );
  expect(sections).toEqual(["基本情報", "対象期間・支払い期限"]);
  for (const name of ["明細", "備考", "出力"]) {
    expect(columns).not.toContainElement(screen.getByRole("group", { name }));
  }
});
