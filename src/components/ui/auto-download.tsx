"use client";

import { useEffect } from "react";

/**
 * 表示したときにファイルのダウンロードを始め、URL からダウンロード指定を消す。
 * PDF 出力後の画面（`?download=...` 付き）で使う。ブラウザが自動ダウンロードを
 * ブロックした場合に備えて、手動でダウンロードできるリンクも表示する。
 */
export function AutoDownload({
  href,
  fileName,
  cleanUrl,
}: {
  href: string;
  fileName: string;
  /** ダウンロード指定を除いた、この画面の URL */
  cleanUrl: string;
}) {
  useEffect(() => {
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    link.click();
    // 再読み込みで再びダウンロードしないよう URL だけ書き換える（画面は再描画しない）
    window.history.replaceState(null, "", cleanUrl);
  }, [href, fileName, cleanUrl]);

  return (
    <p
      role="status"
      className="mb-6 rounded border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
    >
      PDFを出力しました。ダウンロードが始まらない場合は
      <a href={href} download={fileName} className="mx-1 font-bold underline">
        こちら
      </a>
      からダウンロードしてください。
    </p>
  );
}
