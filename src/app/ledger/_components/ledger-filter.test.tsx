import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { parseLedgerListQuery } from "@/lib/ledger/list-query";
import { LedgerFilter } from "./ledger-filter";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("next/form", () => ({
  default: ({
    action,
    scroll: _scroll,
    ...props
  }: React.ComponentProps<"form"> & { action: string; scroll?: boolean }) => (
    <form data-action={action} {...props} />
  ),
}));

test("キーワード・取引先・請求日（年月）・状態で絞り込め、いまの条件を表示する", () => {
  render(
    <LedgerFilter
      query={parseLedgerListQuery({
        q: "保守",
        client: "テスト商事",
        from: "2026-01",
        status: ["sent"],
        sort: "total",
        order: "desc",
      })}
      clientNames={["サンプル産業株式会社", "テスト商事"]}
      active
    />,
  );
  expect(screen.getByRole("searchbox", { name: "キーワード" })).toHaveValue(
    "保守",
  );
  expect(screen.getByRole("combobox", { name: "取引先" })).toHaveValue(
    "テスト商事",
  );
  expect(screen.getByLabelText("請求日の開始")).toHaveValue("2026-01");
  expect(screen.getByLabelText("請求日の終了")).toHaveValue("");
  expect(screen.getByRole("checkbox", { name: "未送信" })).not.toBeChecked();
  expect(screen.getByRole("checkbox", { name: "未入金" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "入金済" })).not.toBeChecked();
  // 並べ替えは絞り込みを変えても残す
  const form = screen.getByRole("search", { name: "絞り込み" });
  expect(form.querySelector('input[type="hidden"][name="sort"]')).toHaveValue(
    "total",
  );
  expect(
    screen.getByRole("button", { name: "条件をクリア" }),
  ).toBeInTheDocument();
});

test("条件が変わって作り直すと（ページで key を変える）、入力していた値は消える", async () => {
  const { rerender } = render(
    <LedgerFilter
      key="from=2026-01"
      query={parseLedgerListQuery({ from: "2026-01" })}
      clientNames={[]}
      active
    />,
  );
  const from = screen.getByLabelText("請求日の開始");
  expect(from).toHaveValue("2026-01");
  // 「条件をクリア」で URL の条件がなくなった
  rerender(
    <LedgerFilter
      key=""
      query={parseLedgerListQuery({})}
      clientNames={[]}
      active={false}
    />,
  );
  expect(screen.getByLabelText("請求日の開始")).toHaveValue("");
});
