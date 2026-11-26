"use client";

import type { ComponentProps } from "react";
import { Button } from "./button";

type ConfirmButtonProps = Omit<ComponentProps<typeof Button>, "type"> & {
  /** 送信前に表示する確認メッセージ */
  confirmMessage: string;
};

/** 確認ダイアログで OK したときだけフォームを送信するボタン */
export function ConfirmButton({
  confirmMessage,
  onClick,
  ...props
}: ConfirmButtonProps) {
  return (
    <Button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...props}
    />
  );
}
