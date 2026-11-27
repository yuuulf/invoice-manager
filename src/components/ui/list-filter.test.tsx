import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ListFilter } from "./list-filter";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("next/form", () => ({
  default: ({
    action,
    scroll: _scroll,
    ...props
  }: React.ComponentProps<"form"> & { action: string; scroll?: boolean }) => (
    <form data-action={action} {...props} />
  ),
}));

function renderFilter(active = false) {
  const submit = vi.fn();
  HTMLFormElement.prototype.requestSubmit = submit;
  render(
    <ListFilter
      basePath="/ledger"
      keyword="保守"
      keywordHint="請求書番号・取引先・件名"
      keep={{ sort: "total", order: "desc", view: undefined }}
      active={active}
    >
      <select aria-label="取引先" name="client" defaultValue="">
        <option value="">すべて</option>
        <option value="A">A</option>
      </select>
    </ListFilter>,
  );
  return { submit };
}

test("キーワードと、残す条件を hidden で持つ", () => {
  renderFilter();
  const form = screen.getByRole("search", { name: "絞り込み" });
  expect(form).toHaveAttribute("data-action", "/ledger");
  expect(screen.getByRole("searchbox", { name: "キーワード" })).toHaveValue(
    "保守",
  );
  const hidden = Array.from(
    form.querySelectorAll<HTMLInputElement>('input[type="hidden"]'),
  ).map((input) => [input.name, input.value]);
  expect(hidden).toEqual([
    ["sort", "total"],
    ["order", "desc"],
  ]);
});

test("条件を変えただけでは送信しない（「検索」で送信する）", () => {
  const { submit } = renderFilter();
  render(
    <ListFilter basePath="/ledger" keyword="" keywordHint="件名" active={false}>
      <input type="month" aria-label="請求日の開始" name="from" />
      <input type="checkbox" aria-label="未送信" name="status" value="unsent" />
    </ListFilter>,
  );
  fireEvent.change(
    screen.getAllByRole("searchbox", { name: "キーワード" })[0],
    {
      target: { value: "開発" },
    },
  );
  fireEvent.change(screen.getByRole("combobox", { name: "取引先" }), {
    target: { value: "A" },
  });
  fireEvent.change(screen.getByLabelText("請求日の開始"), {
    target: { value: "2026-11" },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: "未送信" }));
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getAllByRole("button", { name: "検索" })[0]).toHaveAttribute(
    "type",
    "submit",
  );
});

test("「条件をクリア」は常に出し、押すと入力欄を空にして条件なしの一覧に戻す（残す条件は消さない）", async () => {
  push.mockClear();
  renderFilter(true);
  const keyword = screen.getByRole("searchbox", { name: "キーワード" });
  const client = screen.getByRole("combobox", { name: "取引先" });
  fireEvent.change(client, { target: { value: "A" } });
  fireEvent.click(screen.getByRole("button", { name: "条件をクリア" }));
  expect(keyword).toHaveValue("");
  expect(client).toHaveValue("");
  expect(push).toHaveBeenCalledWith("/ledger?sort=total&order=desc", {
    scroll: false,
  });
});

test("絞り込んでいなくても「条件をクリア」で、まだ検索していない入力を空にできる", () => {
  push.mockClear();
  renderFilter(false);
  const keyword = screen.getByRole("searchbox", { name: "キーワード" });
  fireEvent.change(keyword, { target: { value: "開発" } });
  fireEvent.click(screen.getByRole("button", { name: "条件をクリア" }));
  expect(keyword).toHaveValue("");
  // URL に条件はないので一覧は開き直さない
  expect(push).not.toHaveBeenCalled();
});
