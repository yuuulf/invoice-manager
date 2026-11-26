"use client";

import { useRouter } from "next/navigation";
import { Fragment, type ReactNode } from "react";

/**
 * リンクなどで新しく開くたびに中身の状態をリセットする（ブラウザの戻る・進むでは保つ）。
 * cacheComponents では前に開いた画面の状態が残る（React の Activity）ため、
 * 作成フォームのように毎回まっさらにしたい部分を囲む。
 */
export function ResetOnNavigation({ children }: { children: ReactNode }) {
  const { bfcacheId } = useRouter();
  return <Fragment key={bfcacheId}>{children}</Fragment>;
}
