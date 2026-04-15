import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="screen-center">
      <div className="panel compact stack">
        <h1>403</h1>
        <p className="muted">当前角色无权访问该页面，请联系管理员开通权限。</p>
        <Link className="button" href="/dashboard">
          返回首页
        </Link>
      </div>
    </main>
  );
}
