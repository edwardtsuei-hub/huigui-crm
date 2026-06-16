"use client";

import type { ReactNode } from "react";
import type { Tone } from "../system/primitives";
import { PageHeader } from "../system/primitives";

type SchedulePageHeaderProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  meta?: Array<{ label: string; value: string; tone?: Tone }>;
};

export function SchedulePageHeader({
  title,
  description,
  actions,
  meta,
}: SchedulePageHeaderProps) {
  return (
    <PageHeader
      actions={actions}
      description={description}
      eyebrow="日程管理"
      meta={meta}
      title={title}
    />
  );
}
