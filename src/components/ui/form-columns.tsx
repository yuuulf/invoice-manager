import type { ReactNode } from "react";

/**
 * FormSection を左右 2 列に並べる（縦のスクロールを減らす）。
 * 画面が狭いときは 1 列に戻し、横スクロールさせない
 */
export function FormColumns({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="form-columns"
      className="grid items-start gap-10 lg:grid-cols-2 lg:gap-x-12"
    >
      {children}
    </div>
  );
}
