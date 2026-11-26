import { expect, test, vi } from "vitest";
import Home from "./page";

const redirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect }));

test("トップページは請求書一覧へリダイレクトする", () => {
  Home();
  expect(redirect).toHaveBeenCalledWith("/invoices");
});
