import type { ReactNode } from "react";

/** フォーム内の項目のまとまり（例: 基本情報、振込先） */
export function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-6">
      <legend className="mb-4 w-full border-b border-zinc-200 pb-2 text-lg font-bold">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
