import Link from "next/link";

export default function NotFound() {
  return (
    <main className="screen-center">
      <div className="panel compact stack">
        <h1>404</h1>
        <p className="muted">页面不存在，可能已经被移动或尚未开放。</p>
        <Link className="button" href="/dashboard">
          返回后台首页
        </Link>
      </div>
    </main>
  );
}
