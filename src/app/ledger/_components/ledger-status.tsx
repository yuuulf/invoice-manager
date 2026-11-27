import { CircleCheck, CircleDashed, Send } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import {
  ledgerStatusLabels,
  ledgerStatusOf,
  type LedgerStatus,
} from "@/lib/ledger/status";

const tones: Record<LedgerStatus, StatusTone> = {
  unsent: "neutral",
  sent: "warning",
  paid: "success",
};

const icons: Record<LedgerStatus, typeof Send> = {
  unsent: CircleDashed,
  sent: Send,
  paid: CircleCheck,
};

/**
 * 台帳の状態（spec.md 7.6）。バッジの横に、未入金なら送信日、入金済みなら入金日を出す
 */
export function LedgerStatus({
  sentOn,
  paidOn,
}: {
  sentOn: string | null;
  paidOn: string | null;
}) {
  const status = ledgerStatusOf({ sentOn, paidOn });
  const Icon = icons[status];
  const date =
    status === "paid"
      ? { label: "入金日", value: paidOn }
      : status === "sent"
        ? { label: "送信日", value: sentOn }
        : null;
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <StatusBadge
        tone={tones[status]}
        icon={<Icon className="size-3.5" aria-hidden />}
      >
        {ledgerStatusLabels[status]}
      </StatusBadge>
      {date && (
        <span className="text-xs text-zinc-500" title={date.label}>
          <span className="sr-only">{date.label} </span>
          {date.value}
        </span>
      )}
    </span>
  );
}
