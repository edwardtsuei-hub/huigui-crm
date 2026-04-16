"use client";

import type { ReactNode } from "react";
import { PageHeader, type Tone } from "../system/primitives";

type WorkspacePageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  meta?: Array<{ label: string; value: string; tone?: Tone }>;
};

export function WorkspacePageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: WorkspacePageHeaderProps) {
  return (
    <PageHeader
      actions={actions}
      description={description}
      eyebrow={eyebrow}
      meta={meta}
      title={title}
    />
  );
}
