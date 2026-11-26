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
          className={controlClassName(error, className)}
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
