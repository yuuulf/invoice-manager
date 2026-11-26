import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import NotFound from "./not-found";

test("日本語で見つからない旨を表示し、トップへのリンクを出す", () => {
  render(<NotFound />);
  expect(
    screen.getByRole("heading", { level: 1, name: "ページが見つかりません" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "トップへ戻る" })).toHaveAttribute(
    "href",
    "/",
  );
});
