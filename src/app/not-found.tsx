import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default function NotFound() {
  return (
    <>
      <PageHeader title="ページが見つかりません" />
      <p className="mb-6">
        お探しのページは存在しないか、削除された可能性があります。
      </p>
      <ButtonLink href="/" variant="secondary">
        トップへ戻る
      </ButtonLink>
    </>
  );
}
