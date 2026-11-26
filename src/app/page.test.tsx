import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Page from "./page";

test("トップページにアプリ名の見出しが表示される", () => {
  render(<Page />);
  expect(
    screen.getByRole("heading", { level: 1, name: "請求書管理" }),
  ).toBeInTheDocument();
});
