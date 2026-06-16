import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  MANAGEMENT_ENTRY_PATH,
  isManagementEntryHost,
} from "./lib/public-entry";

const PREVIEW_ROUTE_REDIRECTS: Record<string, string> = {
  "/customers-preview": "/customers",
  "/dashboard-preview": "/dashboard",
  "/files-preview": "/files",
  "/inspections-preview": "/inspections",
  "/management-preview": "/management",
  "/orders-preview": "/orders",
  "/products-ai-import-preview": "/products/ai-import",
  "/products-detail-preview": "/products",
  "/products-edit-preview": "/products",
  "/products-new-preview": "/products/new",
  "/products-parser-original-preview": "/products/ai-import",
  "/products-parser-preview": "/products/ai-import",
  "/products-preview": "/products",
  "/quotations-preview": "/quotations",
  "/search-preview": "/dashboard",
};

function previewRoutesEnabled() {
  return (
    process.env.ENABLE_PREVIEW_ROUTES === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_PREVIEW_ROUTES === "true"
  );
}

function isPreviewRoute(pathname: string) {
  return pathname.endsWith("-preview") || pathname.includes("-preview/");
}

function redirectTo(request: NextRequest, pathname: string) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const pathname = request.nextUrl.pathname;

  if (
    process.env.NODE_ENV === "production" &&
    !previewRoutesEnabled() &&
    isPreviewRoute(pathname)
  ) {
    return redirectTo(request, PREVIEW_ROUTE_REDIRECTS[pathname] ?? "/dashboard");
  }

  if (!isManagementEntryHost(host) || pathname !== "/dashboard") {
    return NextResponse.next();
  }

  return redirectTo(request, MANAGEMENT_ENTRY_PATH);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
