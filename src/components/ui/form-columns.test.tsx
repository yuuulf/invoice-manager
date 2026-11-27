import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FormColumns } from "./form-columns";

test("広い画面では子要素を 2 列に並べ、狭い画面では 1 列にする", () => {
  render(
    <FormColumns>
      <div>左</div>
      <div>右</div>
    </FormColumns>,
  );
  const columns = screen.getByTestId("form-columns");
  expect(columns).toHaveClass("grid", "lg:grid-cols-2");
  expect(columns).not.toHaveClass("grid-cols-2");
  expect(columns.children).toHaveLength(2);
});
