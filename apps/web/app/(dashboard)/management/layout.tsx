"use client";

import { ManagementSubnav } from "../../../components/management/ManagementSubnav";

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="workspace-stack management-shell">
      <section className="management-shell__nav">
        <ManagementSubnav />
      </section>
      {children}
    </div>
  );
}
