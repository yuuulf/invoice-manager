import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { checkInvoiceNumberAction, confirmInvoiceAction } from "../../actions";
import { PreviewActions } from "./preview-actions";

vi.mock("../../actions", () => ({
  checkInvoiceNumberAction: vi.fn(),
  confirmInvoiceAction: vi.fn(),
}));

const checkAction = vi.mocked(checkInvoiceNumberAction);
const confirmAction = vi.mocked(confirmInvoiceAction);

afterEach(() => {
  vi.restoreAllMocks();
  checkAction.mockReset();
  confirmAction.mockReset();
});

function renderActions() {
  render(
    <PreviewActions
      invoiceId={5}
      sampleHref="/invoices/5/pdf"
      fileName="サンプル_請求書_INV-ABC-202611-001.pdf"
    />,
  );
}

const checkbox = () =>
  screen.getByRole("checkbox", {
    name: "確定する（台帳に記録し、以後は変更できません）",
  });
const issueButton = () => screen.getByRole("button", { name: "発行" });

test("編集に戻る・サンプル・発行の順に並ぶ", () => {
  renderActions();
  const back = screen.getByRole("link", { name: "編集に戻る" });
  const sample = screen.getByRole("link", { name: "サンプル" });
  expect(back).toHaveAttribute("href", "/invoices/5/edit");
  expect(sample).toHaveAttribute("href", "/invoices/5/pdf");
  expect(sample).toHaveAttribute(
    "download",
    "サンプル_請求書_INV-ABC-202611-001.pdf",
  );
  expect(back.compareDocumentPosition(sample)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
  expect(sample.compareDocumentPosition(issueButton())).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
});

test("「確定する」にチェックを入れるまで発行は押せない。サンプルはいつでもダウンロードできる", async () => {
  renderActions();
  expect(checkbox()).not.toBeChecked();
  expect(issueButton()).toBeDisabled();
  expect(screen.getByRole("link", { name: "サンプル" })).toBeInTheDocument();

  await userEvent.click(checkbox());
  expect(issueButton()).toBeEnabled();
  await userEvent.click(checkbox());
  expect(issueButton()).toBeDisabled();
});

test("発行を押すと、確認ダイアログの前に請求番号をチェックし、振り直したらダイアログを出さずにメッセージを表示する", async () => {
  const dialog = vi.spyOn(window, "confirm");
  checkAction.mockResolvedValue({
    message:
      "請求番号 INV-ABC-202611-001 はすでに台帳にあるため、INV-ABC-202611-002 に振り直しました。",
  });
  renderActions();
  await userEvent.click(checkbox());
  await userEvent.click(issueButton());

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "すでに台帳にあるため",
  );
  expect(checkAction).toHaveBeenCalledWith(5);
  expect(dialog).not.toHaveBeenCalled();
  expect(confirmAction).not.toHaveBeenCalled();
});

test("番号に問題がなければ確認ダイアログを出し、OK なら発行する", async () => {
  const dialog = vi.spyOn(window, "confirm").mockReturnValue(true);
  checkAction.mockResolvedValue(null);
  confirmAction.mockResolvedValue(null);
  renderActions();
  await userEvent.click(checkbox());
  await userEvent.click(issueButton());

  await vi.waitFor(() => expect(confirmAction).toHaveBeenCalled());
  expect(dialog).toHaveBeenCalledWith(
    "発行すると台帳に記録され、この請求書は変更できなくなります。発行しますか？",
  );
  expect(checkAction.mock.invocationCallOrder[0]).toBeLessThan(
    dialog.mock.invocationCallOrder[0],
  );
  expect(confirmAction.mock.calls[0][1].get("id")).toBe("5");
});

test("確認ダイアログでキャンセルしたら発行しない", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(false);
  checkAction.mockResolvedValue(null);
  renderActions();
  await userEvent.click(checkbox());
  await userEvent.click(issueButton());

  await vi.waitFor(() => expect(checkAction).toHaveBeenCalled());
  expect(confirmAction).not.toHaveBeenCalled();
});

test("発行で振り直しが起きたら（ダイアログの間に別の請求書が発行された等）メッセージを表示する", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  checkAction.mockResolvedValue(null);
  confirmAction.mockResolvedValue({ message: "振り直しました" });
  renderActions();
  await userEvent.click(checkbox());
  await userEvent.click(issueButton());
  expect(await screen.findByRole("alert")).toHaveTextContent("振り直しました");
});
