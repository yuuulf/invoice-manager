"use client";

import { ExternalLink } from "lucide-react";
import { useActionState, useState } from "react";
import { buttonClassName } from "@/components/ui/button";
import { FormActions } from "@/components/ui/form-actions";
import { FormColumns } from "@/components/ui/form-columns";
import { FormSection } from "@/components/ui/form-section";
import { RadioGroup } from "@/components/ui/radio-group";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";
import { useBlurValidation } from "@/components/ui/use-blur-validation";
import { formatAmount, toDateString } from "@/lib/invoices/calc";
import type { LedgerDetail } from "@/lib/ledger/repository";
import {
  ledgerStatuses,
  ledgerStatusOf,
  ledgerStatusOptionLabels,
} from "@/lib/ledger/status";
import {
  LEDGER_MEMO_MAX_LENGTH,
  isHttpUrl,
  readLedgerValues,
  validateLedgerField,
  type LedgerFormValues,
} from "@/lib/ledger/validation";
import type { LedgerFormState } from "../actions";

type Action = (
  state: LedgerFormState,
  formData: FormData,
) => Promise<LedgerFormState>;

function valuesOf(entry: LedgerDetail): LedgerFormValues {
  return {
    status: ledgerStatusOf(entry),
    sentOn: entry.sentOn ?? "",
    paidOn: entry.paidOn ?? "",
    sentFileUrl: entry.sentFileUrl ?? "",
    memo: entry.memo ?? "",
  };
}

/**
 * 台帳の編集フォーム（spec.md 7.6）。確定した内容は表示だけで、
 * 送信・入金の状態と日付、備考を変えられる
 */
export function LedgerForm({
  action,
  entry,
  today,
}: {
  action: Action;
  entry: LedgerDetail;
  /** 送信済み・入金済みにしたときの日付の初期値（yyyy-MM-dd） */
  today: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const { errors, onBlur } = useBlurValidation(
    state,
    state?.errors ?? {},
    (name, formData) => validateLedgerField(name, readLedgerValues(formData)),
  );

  const initial = state?.values ?? valuesOf(entry);

  return (
    <form
      action={formAction}
      onBlur={onBlur}
      noValidate
      className="max-w-4xl space-y-10"
    >
      <input type="hidden" name="id" value={entry.id} />
      <FormColumns>
        <div className="space-y-10">
          <section aria-labelledby="ledger-confirmed">
            <h2
              id="ledger-confirmed"
              className="mb-4 border-b border-zinc-200 pb-2 text-lg font-bold"
            >
              確定した内容
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="font-bold">請求番号</dt>
              <dd className="font-mono">{entry.invoiceNumber}</dd>
              <dt className="font-bold">取引先</dt>
              <dd>{entry.clientName}</dd>
              <dt className="font-bold">事業主</dt>
              <dd>{entry.ownerName}</dd>
              <dt className="font-bold">件名</dt>
              <dd>{entry.subject}</dd>
              <dt className="font-bold">請求日</dt>
              <dd>{entry.issueDate}</dd>
              <dt className="font-bold">合計</dt>
              <dd>{formatAmount(entry.total)}</dd>
              <dt className="font-bold">支払い期限</dt>
              <dd>{entry.dueDate}</dd>
              <dt className="font-bold">確定日</dt>
              <dd>{toDateString(entry.confirmedAt)}</dd>
            </dl>
            <p className="mt-2 text-sm text-zinc-500">
              確定した内容は変更できません。
            </p>
          </section>
          <FormSection title="備考">
            <TextAreaField
              // 送信結果が返ったら、返ってきた値で作り直す
              key={JSON.stringify(state)}
              label="備考"
              name="memo"
              hint={`${LEDGER_MEMO_MAX_LENGTH}文字以内。PDFには出力しません`}
              defaultValue={initial.memo}
              error={errors.memo}
            />
          </FormSection>
        </div>
        {/* 送信結果が返ったら、返ってきた値で入力欄を作り直す */}
        <StatusFields
          key={JSON.stringify(state)}
          initial={initial}
          errors={errors}
          today={today}
        />
      </FormColumns>
      <FormActions mode="edit" cancelHref="/ledger" pending={pending} />
    </form>
  );
}

function StatusFields({
  initial,
  errors,
  today,
}: {
  initial: LedgerFormValues;
  errors: Record<string, string | undefined>;
  today: string;
}) {
  const [status, setStatus] = useState(initial.status);
  const [sentOn, setSentOn] = useState(initial.sentOn);
  const [paidOn, setPaidOn] = useState(initial.paidOn);
  const [sentFileUrl, setSentFileUrl] = useState(initial.sentFileUrl);

  const changeStatus = (next: string) => {
    setStatus(next);
    // 送信済み・入金済みにしたとき、日付が空なら今日を入れる
    if (next !== "unsent" && !sentOn) setSentOn(today);
    if (next === "paid" && !paidOn) setPaidOn(today);
  };

  return (
    <FormSection title="送信・入金">
      <RadioGroup
        legend="状態"
        name="status"
        required
        value={status}
        onValueChange={changeStatus}
        error={errors.status}
        hint="入金済みにできるのは送信した後です。送信済みの台帳は削除できません。"
        options={ledgerStatuses.map((value) => ({
          value,
          label: ledgerStatusOptionLabels[value],
        }))}
      />
      {status !== "unsent" && (
        <div className="w-48">
          <TextField
            label="送信日"
            name="sentOn"
            type="date"
            required
            value={sentOn}
            onChange={(e) => setSentOn(e.target.value)}
            error={errors.sentOn}
          />
        </div>
      )}
      {status !== "unsent" && (
        <TextField
          label="送信ファイル"
          name="sentFileUrl"
          type="url"
          inputMode="url"
          hint="署名したPDFなど、送信ファイルをおいた場所のURL"
          value={sentFileUrl}
          onChange={(e) => setSentFileUrl(e.target.value)}
          error={errors.sentFileUrl}
          addon={<OpenLink url={sentFileUrl} />}
        />
      )}
      {status === "paid" && (
        <div className="w-48">
          <TextField
            label="入金日"
            name="paidOn"
            type="date"
            required
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
            error={errors.paidOn}
          />
        </div>
      )}
    </FormSection>
  );
}

/**
 * 入力した URL を新しいタブで開くリンク（アイコン＋「開く」）。ツールチップに行き先（ホスト名）を出す。
 * 正しい URL でなければ押せない見た目にする（入力欄の幅が変わらないよう、常に表示する）
 */
function OpenLink({ url }: { url: string }) {
  const content = (
    <>
      <ExternalLink className="size-4" aria-hidden />
      開く
    </>
  );
  const className = `${buttonClassName("secondary")} gap-1`;
  if (!isHttpUrl(url)) {
    return (
      <span
        role="link"
        aria-disabled="true"
        aria-label="送信ファイルを開く"
        className={`${className} cursor-not-allowed opacity-50 hover:bg-white`}
      >
        {content}
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="送信ファイルを開く（新しいタブ）"
      title={`${new URL(url).host} を開く`}
      className={className}
    >
      {content}
    </a>
  );
}
