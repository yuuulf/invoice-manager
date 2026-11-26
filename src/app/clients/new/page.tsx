import { PageHeader } from "@/components/ui/page-header";
import { createClientAction } from "../actions";
import { ClientForm } from "../_components/client-form";

export default function Page() {
  return (
    <>
      <PageHeader title="取引先の登録" />
      <ClientForm action={createClientAction} submitLabel="登録する" />
    </>
  );
}
