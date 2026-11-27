"use client";

import type { ComponentProps } from "react";
import { controlClassName, Field } from "./field";
import { inputFilterHandlers } from "./input-filter";

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  error?: string;
  hint?: string;
  /**
   * 入力制限（spec.md 3.1）。入力のたびに値を変換する（例: 数字だけ残す・桁数で切る）。
   * 日本語入力の変換中は変換せず、確定したときに変換する
   */
  inputFilter?: (value: string) => string;
};

export function TextField({
  label,
  error,
  hint,
  required,
  className = "",
  inputFilter,
  onInput,
  onCompositionEnd,
  ...props
}: TextFieldProps) {
  const filter = inputFilter ? inputFilterHandlers(inputFilter) : undefined;
  return (
    <Field label={label} required={required} hint={hint} error={error}>
      {(control) => (
        <input
          {...control}
          className={controlClassName(error, className)}
          onInput={(e) => {
            filter?.onInput(e);
            onInput?.(e);
          }}
          onCompositionEnd={(e) => {
            filter?.onCompositionEnd(e);
            onCompositionEnd?.(e);
          }}
          {...props}
        />
      )}
    </Field>
  );
}
