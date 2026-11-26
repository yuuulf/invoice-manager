import { useId, type ReactNode } from "react";
import { FieldError } from "./field-error";
import { RequiredMark } from "./required-mark";

export type RadioOption = {
  value: string;
  label: string;
  /** 選択肢の横に並べる要素（例: 「翌月 N 日」の N の入力欄） */
  addon?: ReactNode;
};

type RadioGroupProps = {
  legend: string;
  name: string;
  options: readonly RadioOption[];
  defaultValue?: string;
  required?: boolean;
  error?: string;
  hint?: string;
};

export function RadioGroup({
  legend,
  name,
  options,
  defaultValue,
  required,
  error,
  hint,
}: RadioGroupProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="text-sm font-bold">
        {legend}
        {required && <RequiredMark />}
      </legend>
      <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name={name}
                value={option.value}
                defaultChecked={option.value === defaultValue}
                required={required}
              />
              {option.label}
            </label>
            {option.addon}
          </div>
        ))}
      </div>
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-zinc-500">
          {hint}
        </p>
      )}
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}
