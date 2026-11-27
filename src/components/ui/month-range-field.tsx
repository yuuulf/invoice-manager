import { controlClassName } from "./field";

/** 年月の範囲（開始〜終了）の入力欄。見出しは 1 つで、開始・終了は読み上げで区別する */
export function MonthRangeField({
  legend,
  fromName,
  toName,
  defaultFrom,
  defaultTo,
}: {
  legend: string;
  fromName: string;
  toName: string;
  defaultFrom?: string;
  defaultTo?: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold">{legend}</legend>
      <div className="flex items-center gap-1">
        <input
          type="month"
          name={fromName}
          defaultValue={defaultFrom}
          aria-label={`${legend}の開始`}
          className={controlClassName(undefined, "!w-38")}
        />
        <span className="mt-1" aria-hidden>
          〜
        </span>
        <input
          type="month"
          name={toName}
          defaultValue={defaultTo}
          aria-label={`${legend}の終了`}
          className={controlClassName(undefined, "!w-38")}
        />
      </div>
    </fieldset>
  );
}
