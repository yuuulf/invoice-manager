import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Page from "./page";

test("トップページに見出しが表示される", () => {
  render(<Page />);
  expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
});
