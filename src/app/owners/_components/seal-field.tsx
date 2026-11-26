"use client";

import { useEffect, useId, useState, type ChangeEvent } from "react";
import { FieldError } from "@/components/ui/field-error";
import { SEAL_MAX_BYTES } from "@/lib/owners/seal";

/** データ印（PNG、1MB まで）の選択欄。登録済みの印の表示と削除もここで行う */
export function SealField({
  currentSealUrl,
  error,
}: {
  /** 登録済みのデータ印の URL。未登録なら undefined */
  currentSealUrl?: string;
  error?: string;
}) {
  const id = useId();
  const [clientError, setClientError] = useState<string>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [remove, setRemove] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setClientError(undefined);
    setPreviewUrl(undefined);
    if (!file) return;
    if (file.type !== "image/png") {
      setClientError("データ印はPNG画像を選択してください");
      event.target.value = "";
      return;
    }
    if (file.size > SEAL_MAX_BYTES) {
      setClientError("データ印は1MB以下の画像を選択してください");
      event.target.value = "";
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

  const shownUrl = previewUrl ?? (remove ? undefined : currentSealUrl);
  const message = clientError ?? error;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold">
        データ印
      </label>
      <div className="mt-2 flex items-start gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center rounded border border-zinc-200 bg-zinc-50">
          {shownUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- ローカルの PNG と Blob URL を表示するため next/image は使わない
            <img
              src={shownUrl}
              alt="データ印"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-xs text-zinc-400">未登録</span>
          )}
        </div>
        <div className="space-y-2">
          <input
            id={id}
            type="file"
            name="seal"
            accept="image/png"
            onChange={onChange}
            aria-invalid={message ? true : undefined}
            aria-describedby={`${id}-hint${message ? ` ${id}-error` : ""}`}
            className="block text-sm"
          />
          <p id={`${id}-hint`} className="text-sm text-zinc-500">
            PNG画像、1MBまで
          </p>
          {currentSealUrl && (
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                name="removeSeal"
                checked={remove}
                onChange={(e) => setRemove(e.target.checked)}
              />
              データ印を削除
            </label>
          )}
          <FieldError id={`${id}-error`} message={message} />
        </div>
      </div>
    </div>
  );
}
