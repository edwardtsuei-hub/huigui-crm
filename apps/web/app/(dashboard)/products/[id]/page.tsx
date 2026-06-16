"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ProductDetailWorkspace,
  type ProductDetailWorkspaceProduct,
} from "../../../../components/products/ProductDetailWorkspace";
import { type InspectionListItem, type InspectionListResponse } from "../../../../components/inspections/types";
import {
  getCurrentUser,
  hasAnyPermission,
  hasPermission,
  type CurrentUser,
  apiFetch,
} from "../../../../lib/api";
import {
  WORKSPACE_ITEMS_CHANGED_EVENT,
  bucketDueLabel,
  filterVisibleWorkspaceItems,
  listLocalWorkspaceItems,
  type LocalWorkspaceItem,
} from "../../../../lib/workspace";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [product, setProduct] = useState<ProductDetailWorkspaceProduct | null>(null);
  const [workspaceItems, setWorkspaceItems] = useState<LocalWorkspaceItem[]>(
    [],
  );
  const [inspectionItems, setInspectionItems] = useState<InspectionListItem[]>(
    [],
  );
  const [error, setError] = useState("");
  const [inspectionError, setInspectionError] = useState("");

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    apiFetch<ProductDetailWorkspaceProduct>(`/products/${params.id}`)
      .then(setProduct)
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "加载产品详情失败",
        ),
      );
  }, [params.id]);

  useEffect(() => {
    function syncWorkspaceItems() {
      setWorkspaceItems(
        filterVisibleWorkspaceItems(listLocalWorkspaceItems()).filter(
          (item) => item.relatedId === params.id,
        ),
      );
    }

    syncWorkspaceItems();
    window.addEventListener(WORKSPACE_ITEMS_CHANGED_EVENT, syncWorkspaceItems);
    return () => {
      window.removeEventListener(
        WORKSPACE_ITEMS_CHANGED_EVENT,
        syncWorkspaceItems,
      );
    };
  }, [params.id]);

  useEffect(() => {
    let cancelled = false;

    apiFetch<InspectionListResponse>(
      `/inspections?productId=${params.id}&pageSize=5`,
    )
      .then((response) => {
        if (!cancelled) {
          setInspectionItems(response.items);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setInspectionError(
            requestError instanceof Error ? requestError.message : "加载检测记录失败",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const canEdit = hasAnyPermission(currentUser, [
    "action.product.update",
    "action.product.create",
  ]);
  const canManageFiles = hasPermission(currentUser, "page.files.center");

  if (!product) {
    return (
      <section className="panel">{error || "正在加载产品详情..."}</section>
    );
  }

  return (
    <ProductDetailWorkspace
      canEdit={canEdit}
      canManageFiles={canManageFiles}
      currentUserDisplayName={currentUser?.displayName}
      inspectionDetailHrefBuilder={(id) => `/inspections/${id}`}
      inspectionError={inspectionError}
      inspectionItems={inspectionItems}
      links={{
        detailHref: `/products/${product.id}`,
        editHref: `/products/${product.id}/edit`,
        inspectionsHref: `/inspections?productId=${product.id}`,
        listHref: "/products",
        newInspectionHref: `/inspections/new?productId=${product.id}`,
        newQuoteHref: "/solutions/industry/new",
        previewHref: "/products-detail-preview",
      }}
      product={product}
      workspaceItems={workspaceItems}
    />
  );
}
