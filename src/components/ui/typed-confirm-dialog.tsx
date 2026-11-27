"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { RowActionResult } from "@/lib/action-result";
import { Button } from "./button";
import { FieldError } from "./field-error";

/**
 * 決められた文字列（例: 請求書番号）を入力したときだけ実行できる確認ダイアログ。
 * 取り消せない重要な操作（台帳の削除など。spec.md 4）に使う。
 */
export function TypedConfirmDialog({
  open,
  onClose,
  title,
  description,
  expected,
  inputLabel,
  submitLabel,
  action,
  hiddenFields,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  /** 入力させる文字列 */
  expected: string;
  inputLabel: string;
  submitLabel: string;
  action: (formData: FormData) => Promise<RowActionResult | void>;
  /** 一緒に送る値（例: { id: "3" }） */
  hiddenFields: Record<string, string>;
}) {
  const titleId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const close = () => {
    setTyped("");
    setError(undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded bg-white p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <div className="mt-2 text-sm text-zinc-700">{description}</div>
        <form
          className="mt-4 space-y-4"
          action={async (formData) => {
            setPending(true);
            const result = await action(formData);
            setPending(false);
            if (result?.error) {
              setError(result.error);
              return;
            }
            close();
          }}
        >
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <div>
            <label htmlFor={inputId} className="block text-sm font-bold">
              {inputLabel}
            </label>
            <input
              ref={inputRef}
              id={inputId}
              name="confirmation"
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={expected}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-error` : undefined}
              className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 font-mono"
            />
            <FieldError id={`${inputId}-error`} message={error} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              キャンセル
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={pending || typed.trim() !== expected}
            >
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
