import { Button, ButtonLink } from "./button";

export type FormMode = "create" | "edit";

/** 送信ボタンの文言。新規は「作成」、編集は「保存」で統一する */
export const submitLabels: Record<FormMode, string> = {
  create: "作成",
  edit: "保存",
};

/**
 * フォーム下部のボタン列。入力欄の右端に揃え、左から「キャンセル」「作成／保存」の順に並べる。
 */
export function FormActions({
  mode,
  cancelHref,
  pending = false,
}: {
  mode: FormMode;
  cancelHref: string;
  pending?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2">
      <ButtonLink href={cancelHref} variant="secondary">
        キャンセル
      </ButtonLink>
      <Button type="submit" disabled={pending}>
        {submitLabels[mode]}
      </Button>
    </div>
  );
}
