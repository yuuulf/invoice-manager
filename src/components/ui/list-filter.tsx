"use client";

import { Eraser, Search } from "lucide-react";
import Form from "next/form";
import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { Button } from "./button";
import { IconButton } from "./icon-button";
import { TextField } from "./text-field";

/**
 * 一覧の上に置く絞り込み欄（spec.md 3.2）。送信すると条件を URL に入れて一覧を表示し直す。
 * 条件を変えただけでは検索せず、「検索」（キーワード欄なら Enter も）で反映する。
 * 「条件をクリア」は常に出し、入力欄を空にする（絞り込み中なら条件なしの一覧に戻す）
 */
export function ListFilter({
  basePath,
  keyword,
  keywordHint,
  keep = {},
  active,
  children,
}: {
  basePath: string;
  /** いまのキーワード */
  keyword: string;
  /** キーワードで探す項目の説明（例: 「会社名・取引先コード」） */
  keywordHint: string;
  /** 絞り込み欄にない条件で、送信しても残すもの（例: アーカイブ一覧、並べ替え） */
  keep?: Record<string, string | undefined>;
  /** 絞り込み中か（クリアしたら条件なしの一覧に戻す） */
  active: boolean;
  /** キーワード以外の条件の入力欄 */
  children?: ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const clearParams = new URLSearchParams(
    Object.entries(keep).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  ).toString();

  /** 入力欄を空にし、絞り込み中なら条件なしの一覧に戻す（残す条件はそのまま） */
  const clear = () => {
    for (const element of Array.from(formRef.current?.elements ?? [])) {
      if (element instanceof HTMLSelectElement) element.value = "";
      if (!(element instanceof HTMLInputElement)) continue;
      if (element.type === "hidden") continue;
      if (element.type === "checkbox" || element.type === "radio") {
        element.checked = false;
      } else {
        element.value = "";
      }
    }
    if (active) {
      router.push(clearParams ? `${basePath}?${clearParams}` : basePath, {
        scroll: false,
      });
    }
  };

  return (
    <Form
      ref={formRef}
      action={basePath}
      scroll={false}
      role="search"
      aria-label="絞り込み"
      // 条件と「検索」を 1 行に並べる。キーワード欄が残りの幅を使い、狭い画面では折り返す
      className="mb-4 flex flex-wrap items-end gap-x-3 gap-y-2"
    >
      {Object.entries(keep).map(
        ([name, value]) =>
          value && <input key={name} type="hidden" name={name} value={value} />,
      )}
      <div className="max-w-72 min-w-28 flex-1">
        <TextField
          label="キーワード"
          name="q"
          type="search"
          defaultValue={keyword}
          placeholder={keywordHint}
          title={`${keywordHint}から探します。空白で区切ると、すべてを含むものを探します`}
        />
      </div>
      {children}
      <div className="flex shrink-0 items-center gap-1">
        <Button type="submit" variant="secondary" className="gap-1">
          <Search className="size-4" aria-hidden />
          検索
        </Button>
        <IconButton
          label="条件をクリア"
          icon={<Eraser className="size-5" aria-hidden />}
          onClick={clear}
        />
      </div>
    </Form>
  );
}
