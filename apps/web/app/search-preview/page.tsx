import Link from "next/link";
import { GlobalSearchPreview } from "../../components/system/GlobalSearchPreview";
import { PreviewShell } from "../../components/system/PreviewShell";

export default function SearchPreviewPage() {
  return (
    <PreviewShell
      actions={
        <>
          <Link className="button ghost inline" href="/login">
            前往登录
          </Link>
          <Link className="button secondary inline" href="/dashboard">
            返回正式工作台
          </Link>
        </>
      }
      description="这版只验证“顶栏入口 + 独立搜索层”的方向，确认后我再接入正式顶栏。"
      label="搜索预览页"
    >
      <GlobalSearchPreview />
    </PreviewShell>
  );
}
