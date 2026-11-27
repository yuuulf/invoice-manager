import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ClampedText, tableClass, TableScroll } from "./data-table";

test("1 行で「…」に省略し、全文をツールチップに出す", () => {
  render(<ClampedText>とても長い部署名</ClampedText>);
  const text = screen.getByText("とても長い部署名");
  expect(text).toHaveClass("truncate");
  expect(text).toHaveAttribute("title", "とても長い部署名");
});

test("空なら何も表示しない", () => {
  const { container } = render(<ClampedText>{null}</ClampedText>);
  expect(container).toBeEmptyDOMElement();
});

test("TableScroll は表だけを横スクロールさせ、表には最小幅がある", () => {
  render(
    <TableScroll>
      <table className={tableClass}>
        <tbody>
          <tr>
            <td>a</td>
          </tr>
        </tbody>
      </table>
    </TableScroll>,
  );
  const table = screen.getByRole("table");
  expect(table).toHaveClass("w-full", "min-w-[59rem]", "table-fixed");
  expect(table.parentElement).toHaveClass("overflow-x-auto");
});
