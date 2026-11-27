import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { ListFilter } from "@/components/ui/list-filter";
import { MonthRangeField } from "@/components/ui/month-range-field";
import { SelectField } from "@/components/ui/select-field";
import {
  LEDGER_FILTER_PARAM,
  type LedgerListQuery,
} from "@/lib/ledger/list-query";
import { ledgerStatuses, ledgerStatusLabels } from "@/lib/ledger/status";
import { LIST_PARAM } from "@/lib/list-query";

/**
 * 台帳一覧の絞り込み（spec.md 3.2・7.6）。キーワード・取引先・請求日の範囲（年月）・状態
 */
export function LedgerFilter({
  query,
  clientNames,
  active,
}: {
  query: LedgerListQuery;
  clientNames: string[];
  active: boolean;
}) {
  return (
    <ListFilter
      basePath="/ledger"
      keyword={query.keyword}
      keywordHint="請求書番号・取引先・件名・備考"
      keep={{
        [LIST_PARAM.sort]: query.sort?.key,
        [LIST_PARAM.order]: query.sort?.order,
      }}
      active={active}
    >
      <div className="w-36">
        <SelectField
          label="取引先"
          name={LEDGER_FILTER_PARAM.client}
          placeholder="すべて"
          defaultValue={query.client}
          options={clientNames.map((name) => ({ value: name, label: name }))}
        />
      </div>
      <MonthRangeField
        legend="請求日"
        fromName={LEDGER_FILTER_PARAM.from}
        toName={LEDGER_FILTER_PARAM.to}
        defaultFrom={query.from}
        defaultTo={query.to}
      />
      <CheckboxGroup
        legend="状態"
        name={LEDGER_FILTER_PARAM.status}
        defaultValues={query.statuses}
        options={ledgerStatuses.map((value) => ({
          value,
          label: ledgerStatusLabels[value],
        }))}
      />
    </ListFilter>
  );
}
