import type { ComponentProps } from "react";
import { controlClassName, Field } from "./field";

export type SelectOption = { value: string; label: string };

type SelectFieldProps = Omit<ComponentProps<"select">, "id" | "children"> & {
  label: string;
  options: readonly SelectOption[];
  /** 未選択の選択肢の表示（例: 「選択してください」） */
  placeholder?: string;
  error?: string;
  hint?: string;
};

export function SelectField({
  label,
  options,
  placeholder = "選択してください",
  error,
  hint,
  required,
  className = "",
  ...props
}: SelectFieldProps) {
  return (
    <Field label={label} required={required} hint={hint} error={error}>
      {(control) => (
        <select
          {...control}
          // select は文字の行の高さが入力欄と違い低くなるため、入力欄（文字 1.5rem＋上下の余白＋枠線）と同じ高さにそろえる
          className={controlClassName(error, `h-[2.625rem] ${className}`)}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
