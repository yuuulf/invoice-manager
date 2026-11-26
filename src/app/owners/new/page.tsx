import { PageHeader } from "@/components/ui/page-header";
import { ResetOnNavigation } from "@/components/ui/reset-on-navigation";
import { createOwnerAction } from "../actions";
import { OwnerForm } from "../_components/owner-form";

export default function Page() {
  return (
    <>
      <PageHeader title="事業主の作成" />
      <ResetOnNavigation>
        <OwnerForm action={createOwnerAction} mode="create" />
      </ResetOnNavigation>
    </>
  );
}
