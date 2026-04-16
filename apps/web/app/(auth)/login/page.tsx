"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, getToken, readErrorMessage, setAuth } from "../../../lib/api";
import { PUBLIC_ENTRY_HOST } from "../../../lib/public-entry";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetchApi("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = await response.json();
      setAuth(payload);
      router.replace("/dashboard");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="screen-center">
      <div className="login-shell">
        <section className="brand-hero">
          <p className="small">Sprint 1 MVP</p>
          <h1>洄归生态客户管理与报价协同系统</h1>
          <p>
            当前以网页端 CRM 与报价协同为主，优先覆盖农业方案、通用报价、客户管理与站内提醒，
            团队正式入口统一为 {PUBLIC_ENTRY_HOST}。
          </p>
          <ul>
            <li>客户全生命周期管理与跟进记录</li>
            <li>产品库、农业方案报价、通用行业报价</li>
            <li>报价记录追溯、站内通知提醒、后台基础权限</li>
          </ul>
        </section>

        <section className="panel">
          <div className="login-panel-stack">
            <div className="status-badge">正式入口</div>
            <div className="stack">
              <h2>登录系统</h2>
              <p className="muted">
                请统一从 {PUBLIC_ENTRY_HOST} 进入系统，避免继续使用临时 IP 或历史地址。
              </p>
            </div>
          </div>

          <form className="stack" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="username">用户名</label>
              <input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="请输入用户名"
              />
            </div>

            <div className="field">
              <label htmlFor="password">密码</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入密码"
              />
            </div>

            {error ? <div className="danger-text small">{error}</div> : null}

            <button type="submit" disabled={loading}>
              {loading ? "登录中..." : "登录后台"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
