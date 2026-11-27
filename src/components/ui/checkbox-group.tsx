import type { ReactNode } from "react";

export type CheckboxOption = { value: string; label: ReactNode };

/** 複数選べるチェックボックスのまとまり（例: 台帳の状態での絞り込み） */
export function CheckboxGroup({
  legend,
  name,
  options,
  defaultValues = [],
}: {
  legend: string;
  name: string;
  options: readonly CheckboxOption[];
  defaultValues?: readonly string[];
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold">{legend}</legend>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={defaultValues.includes(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
