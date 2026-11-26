import { useId, type ReactNode } from "react";
import { FieldError } from "./field-error";
import { RequiredMark } from "./required-mark";

export type FieldControlProps = {
  id: string;
  required?: boolean;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

/**
 * ラベル・注釈・エラーを入力欄に関連付けて表示する。入力欄は children に関数で渡す。
 * TextField / SelectField / TextAreaField の共通部分。
 */
export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: (control: FieldControlProps) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold">
        {label}
        {required && <RequiredMark />}
      </label>
      {children({
        id,
        required,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-zinc-500">
          {hint}
        </p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function controlClassName(error: string | undefined, extra = "") {
  return `mt-1 block w-full rounded border bg-white px-3 py-2 ${error ? "border-red-600" : "border-zinc-300"} ${extra}`;
}
