"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import {
  type DiscussionCommentItem,
  type DiscussionListResponse,
  formatDiscussionDateTime,
} from "../../lib/discussions";
import {
  EmptyState,
  SectionCard,
  StatusBadge,
} from "../system/primitives";

type DiscussionPanelProps = {
  commentsPath?: string | null;
  description?: string;
  title?: string;
};

export function DiscussionPanel({
  commentsPath,
  description = "針對當前內容補充背景、交接、風險與回覆，新增留言會進入通知中心。",
  title = "討論區",
}: DiscussionPanelProps) {
  const [data, setData] = useState<DiscussionListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadComments() {
      if (!commentsPath) {
        setData(null);
        return;
      }

      setData(null);
      setLoading(true);
      setError("");

      try {
        const response = await apiFetch<DiscussionListResponse>(commentsPath);
        if (!cancelled) {
          setData(response);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "留言加载失败",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadComments();

    return () => {
      cancelled = true;
    };
  }, [commentsPath]);

  async function submitNewComment() {
    if (!commentsPath || !newContent.trim()) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const created = await apiFetch<DiscussionCommentItem>(commentsPath, {
        method: "POST",
        body: JSON.stringify({ content: newContent }),
      });
      setData((current) =>
        current
          ? {
              ...current,
              items: [...current.items, created],
            }
          : current,
      );
      setNewContent("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "留言保存失败",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveEditedComment() {
    if (!commentsPath || !editingId || !editingContent.trim()) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updated = await apiFetch<DiscussionCommentItem>(
        `${commentsPath}/${editingId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ content: editingContent }),
        },
      );
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );
      setEditingId(null);
      setEditingContent("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "留言更新失败",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title={title}
      description={description}
      actions={
        data?.target ? (
          <div className="small muted">当前对象：{data.target.targetName}</div>
        ) : null
      }
    >
      <div className="stack" id="discussion">
        {loading ? <div className="small muted">正在整理讨论记录...</div> : null}
        {error ? <div className="danger-text small">{error}</div> : null}

        <div className="field">
          <label htmlFor="discussion-new-comment">新增留言</label>
          <textarea
            id="discussion-new-comment"
            onChange={(event) => setNewContent(event.target.value)}
            placeholder="补充上下文、风险、交接事项或回复建议。"
            rows={4}
            value={newContent}
          />
          <div className="action-row">
            <button
              className="button inline"
              disabled={saving || !newContent.trim()}
              onClick={() => void submitNewComment()}
              type="button"
            >
              {saving ? "保存中..." : "发表留言"}
            </button>
          </div>
        </div>

        {data?.items.length ? (
          <div className="discussion-list">
            {data.items.map((item) => {
              const isEditing = editingId === item.id;

              return (
                <article className="discussion-card" key={item.id}>
                  <div className="discussion-card__meta">
                    <div className="stack compact-gap">
                      <strong>{item.user.displayName}</strong>
                      <div className="small muted">
                        {formatDiscussionDateTime(item.createdAt)}
                      </div>
                    </div>
                    <div className="action-row">
                      {item.isEdited ? (
                        <StatusBadge tone="neutral" variant="badge">
                          已编辑
                        </StatusBadge>
                      ) : null}
                      {item.canEdit && !isEditing ? (
                        <button
                          className="button ghost inline"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditingContent(item.content);
                          }}
                          type="button"
                        >
                          编辑
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="stack">
                      <textarea
                        onChange={(event) => setEditingContent(event.target.value)}
                        rows={4}
                        value={editingContent}
                      />
                      <div className="action-row">
                        <button
                          className="button inline"
                          disabled={saving || !editingContent.trim()}
                          onClick={() => void saveEditedComment()}
                          type="button"
                        >
                          {saving ? "保存中..." : "保存修改"}
                        </button>
                        <button
                          className="button secondary inline"
                          disabled={saving}
                          onClick={() => {
                            setEditingId(null);
                            setEditingContent("");
                          }}
                          type="button"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="detail-note">{item.content}</div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="还没有留言"
            description="先写第一条讨论，后续有新留言会在右上角通知里显示数字角标。"
          />
        )}
      </div>
    </SectionCard>
  );
}
