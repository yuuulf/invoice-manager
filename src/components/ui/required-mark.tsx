/** 必須項目のラベルに付ける赤い「*」。読み上げでは「必須」と伝える */
export function RequiredMark() {
  return (
    <>
      <span aria-hidden className="ml-0.5 text-red-600">
        *
      </span>
      <span className="sr-only">必須</span>
    </>
  );
}
