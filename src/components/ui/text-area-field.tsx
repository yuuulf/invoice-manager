import type { ComponentProps } from "react";
import { controlClassName, Field } from "./field";

type TextAreaFieldProps = Omit<ComponentProps<"textarea">, "id"> & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextAreaField({
  label,
  error,
  hint,
  required,
  className = "",
  rows = 4,
  ...props
}: TextAreaFieldProps) {
  return (
    <Field label={label} required={required} hint={hint} error={error}>
      {(control) => (
        <textarea
          {...control}
          rows={rows}
          className={controlClassName(error, className)}
          {...props}
        />
      )}
    </Field>
  );
}
