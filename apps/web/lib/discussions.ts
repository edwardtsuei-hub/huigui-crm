"use client";

export type DiscussionCommentItem = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  canEdit: boolean;
  user: {
    id: string;
    name: string;
    displayName: string;
  };
};

export type DiscussionListResponse = {
  target: {
    id: string;
    relatedType: string;
    ownerUserId: string;
    ownerDisplayName: string;
    targetName: string;
  };
  items: DiscussionCommentItem[];
};

export function formatDiscussionDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
