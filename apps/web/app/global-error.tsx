"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <main className="screen-center">
          <div className="panel compact stack">
            <h1>500</h1>
            <p className="muted">系统出现异常，请稍后重试。</p>
            <div className="small danger-text">{error.message}</div>
            <div className="toolbar">
              <button onClick={reset}>重新加载</button>
              <Link className="button secondary" href="/dashboard">
                返回首页
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
