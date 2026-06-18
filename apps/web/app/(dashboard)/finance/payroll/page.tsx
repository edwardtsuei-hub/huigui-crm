import { WorkspacePageHeader } from "../../../../components/dashboard/WorkspacePageHeader";
import { PayrollWorkbench } from "../../../../components/payroll/PayrollWorkbench";

export default function FinancePayrollPage() {
  return (
    <div className="page-shell">
      <WorkspacePageHeader
        description="财务在原本的大爱归心后台内完成薪资表上传、核对、发布和通知记录，不再跳到独立员工端入口。"
        eyebrow="财务薪资"
        meta={[
          { label: "入口", value: "主后台" },
          { label: "权限", value: "财务" },
          { label: "流程", value: "上传到发布" },
        ]}
        title="薪资上传与发送"
      />
      <PayrollWorkbench />
    </div>
  );
}
