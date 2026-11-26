import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { confirmInvoiceAction } from "../../actions";
import { PreviewActions } from "./preview-actions";

vi.mock("../../actions", () => ({ confirmInvoiceAction: vi.fn() }));

const confirmAction = vi.mocked(confirmInvoiceAction);

afterEach(() => {
  vi.restoreAllMocks();
  confirmAction.mockReset();
});

function renderActions() {
  render(
    <PreviewActions
      invoiceId={5}
      sampleHref="/invoices/5/pdf"
      fileName="請求書_IABC-202611-001.pdf"
    />,
  );
}

test("編集に戻る・SAMPLEをダウンロード・確定してダウンロードの順に並ぶ", () => {
  renderActions();
  const back = screen.getByRole("link", { name: "編集に戻る" });
  const sample = screen.getByRole("link", { name: "SAMPLEをダウンロード" });
  const confirm = screen.getByRole("button", { name: "確定してダウンロード" });
  expect(back).toHaveAttribute("href", "/invoices/5/edit");
  expect(sample).toHaveAttribute("href", "/invoices/5/pdf");
  expect(sample).toHaveAttribute("download", "請求書_IABC-202611-001.pdf");
  expect(back.compareDocumentPosition(sample)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
  expect(sample.compareDocumentPosition(confirm)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
});

test("「確定する」にチェックを入れるまで確定してダウンロードは押せない。SAMPLE はいつでもダウンロードできる", async () => {
  renderActions();
  const confirm = screen.getByRole("button", { name: "確定してダウンロード" });
  const checkbox = screen.getByRole("checkbox", { name: "確定する" });
  expect(checkbox).not.toBeChecked();
  expect(confirm).toBeDisabled();
  expect(
    screen.getByRole("link", { name: "SAMPLEをダウンロード" }),
  ).toBeInTheDocument();

  await userEvent.click(checkbox);
  expect(confirm).toBeEnabled();
  await userEvent.click(checkbox);
  expect(confirm).toBeDisabled();
});

test("確定は確認ダイアログで OK したときだけ実行する", async () => {
  const confirmDialog = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
  confirmAction.mockResolvedValue(null);
  renderActions();
  await userEvent.click(screen.getByRole("checkbox", { name: "確定する" }));
  await userEvent.click(
    screen.getByRole("button", { name: "確定してダウンロード" }),
  );
  expect(confirmDialog).toHaveBeenCalled();
  expect(confirmAction).not.toHaveBeenCalled();

  confirmDialog.mockReturnValueOnce(true);
  await userEvent.click(
    screen.getByRole("button", { name: "確定してダウンロード" }),
  );
  await vi.waitFor(() => expect(confirmAction).toHaveBeenCalled());
  expect(confirmAction.mock.calls[0][1].get("id")).toBe("5");
});

test("確定できなかったらメッセージを表示する", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  confirmAction.mockResolvedValue({
    message: "請求番号が台帳と重複するため IABC-202611-002 に振り直しました",
  });
  renderActions();
  await userEvent.click(screen.getByRole("checkbox", { name: "確定する" }));
  await userEvent.click(
    screen.getByRole("button", { name: "確定してダウンロード" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("振り直しました");
});
