import { headers } from "next/headers";
import {
  isManagementEntryHost,
  resolveDisplayedEntryHost,
} from "../../../lib/public-entry";
import LoginPageClient from "./LoginPageClient";

export default function LoginPage() {
  const requestHeaders = headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  return (
    <LoginPageClient
      initialEntryHost={resolveDisplayedEntryHost(host)}
      initialManagementEntry={isManagementEntryHost(host)}
      initialHost={host}
    />
  );
}
