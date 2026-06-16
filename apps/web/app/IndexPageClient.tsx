"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SiteBrand } from "../lib/site-brand";

export default function IndexPageClient({
  brand,
  host,
}: {
  brand: SiteBrand;
  host?: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <main className="screen-center">
      <div className="panel compact">
        <h1>{brand.loadingTitle}</h1>
        <p>{brand.loadingSubtitle}</p>
      </div>
    </main>
  );
}
