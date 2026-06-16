import { headers } from "next/headers";
import DashboardLayoutClient from "./DashboardLayoutClient";
import { resolveSiteBrand } from "../../lib/site-brand";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const brand = resolveSiteBrand(host);

  return <DashboardLayoutClient brand={brand}>{children}</DashboardLayoutClient>;
}
