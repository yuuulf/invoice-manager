import type { CompositionEvent, FormEvent } from "react";

/**
 * 入力制限（spec.md 3.1）のイベントハンドラ。入力のたびに値を filter で変換する。
 * 日本語入力の変換中は変換せず、確定したときに変換する。TextField 以外の入力欄でも使う
 */
export function inputFilterHandlers(filter: (value: string) => string) {
  const apply = (input: HTMLInputElement) => {
    const next = filter(input.value);
    if (next !== input.value) input.value = next;
  };
  return {
    onInput: (e: FormEvent<HTMLInputElement>) => {
      if (!(e.nativeEvent as InputEvent).isComposing) apply(e.currentTarget);
    },
    onCompositionEnd: (e: CompositionEvent<HTMLInputElement>) =>
      apply(e.currentTarget),
  };
}
