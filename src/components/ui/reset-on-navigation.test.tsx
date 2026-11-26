import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { ResetOnNavigation } from "./reset-on-navigation";

const router = vi.hoisted(() => ({ bfcacheId: "a" }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}

test("新しく開いたとき（bfcacheId が変わったとき）だけ中身の状態をリセットする", async () => {
  const { rerender } = render(
    <ResetOnNavigation>
      <Counter />
    </ResetOnNavigation>,
  );
  await userEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button")).toHaveTextContent("1");

  // 戻る・進むなどで bfcacheId が同じなら保つ
  rerender(
    <ResetOnNavigation>
      <Counter />
    </ResetOnNavigation>,
  );
  expect(screen.getByRole("button")).toHaveTextContent("1");

  router.bfcacheId = "b";
  rerender(
    <ResetOnNavigation>
      <Counter />
    </ResetOnNavigation>,
  );
  expect(screen.getByRole("button")).toHaveTextContent("0");
});
