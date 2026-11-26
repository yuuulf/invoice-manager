import { useId, type ComponentProps } from "react";
import { FieldError } from "./field-error";
import { RequiredMark } from "./required-mark";

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
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`mt-1 block w-full rounded border px-3 py-2 ${error ? "border-red-600" : "border-zinc-300"} ${className}`}
        {...props}
      />
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-zinc-500">
          {hint}
        </p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}
