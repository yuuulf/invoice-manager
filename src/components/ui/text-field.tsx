import type { ComponentProps } from "react";
import { controlClassName, Field } from "./field";

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextField({
  label,
  error,
  hint,
  required,
  className = "",
  ...props
}: TextFieldProps) {
  return (
    <Field label={label} required={required} hint={hint} error={error}>
      {(control) => (
        <input
          {...control}
          className={controlClassName(error, className)}
          {...props}
        />
      )}
    </Field>
  );
}
