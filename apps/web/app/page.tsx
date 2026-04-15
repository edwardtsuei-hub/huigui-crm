"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "../lib/api";

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
      return;
    }

    router.replace("/login");
  }, [router]);

  return (
    <main className="screen-center">
      <div className="panel compact">
        <h1>洄归生态客户管理与报价协同系统</h1>
        <p>正在进入系统...</p>
      </div>
    </main>
  );
}
