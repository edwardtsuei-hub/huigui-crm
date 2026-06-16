import { headers } from "next/headers";
import IndexPageClient from "./IndexPageClient";
import { resolveSiteBrand } from "../lib/site-brand";

export default function IndexPage() {
  const requestHeaders = headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const brand = resolveSiteBrand(host);

  return <IndexPageClient brand={brand} host={host} />;
}
