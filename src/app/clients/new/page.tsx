import { PageHeader } from "@/components/ui/page-header";
import { ResetOnNavigation } from "@/components/ui/reset-on-navigation";
import { createClientAction } from "../actions";
import { ClientForm } from "../_components/client-form";

export default function Page() {
  return (
    <>
      <PageHeader title="取引先の作成" />
      <ResetOnNavigation>
        <ClientForm action={createClientAction} mode="create" />
      </ResetOnNavigation>
    </>
  );
}
