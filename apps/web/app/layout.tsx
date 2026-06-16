import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { resolveSiteBrand } from "../lib/site-brand";

function getRequestHost() {
  const requestHeaders = headers();
  return (
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    undefined
  );
}

export function generateMetadata(): Metadata {
  const brand = resolveSiteBrand(getRequestHost());

  return {
    title: brand.metadataTitle,
    description: brand.metadataDescription,
    icons: {
      icon: "/favicon.ico",
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brand = resolveSiteBrand(getRequestHost());

  return (
    <html lang="zh-CN">
      <body data-site-brand={brand.key}>{children}</body>
    </html>
  );
}
