/** フォーム全体に関わるエラーメッセージ（例: 必須項目が足りず出力できない） */
export function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </p>
  );
}
