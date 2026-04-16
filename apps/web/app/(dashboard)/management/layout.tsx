"use client";

import { ManagementSubnav } from "../../../components/management/ManagementSubnav";

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="workspace-stack">
      <ManagementSubnav />
      {children}
    </div>
  );
}
