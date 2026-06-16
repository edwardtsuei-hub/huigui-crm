"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { WorkspacePageHeader } from "../../../components/dashboard/WorkspacePageHeader";
import {
  SectionCard,
  StatusBadge,
  SummaryCard,
} from "../../../components/system/primitives";
import { getCurrentUser } from "../../../lib/api";
import { useUnsavedChangesGuard } from "../../../lib/management";
import {
  fetchSettingsOverview,
  toSettingsDraft,
  updateSettingsOverview,
  type IntegrationStatus,
  type SettingsOverviewDraft,
  type SettingsOverviewResponse,
} from "../../../lib/settings";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "未保存";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function sameDraft(
  left: SettingsOverviewDraft | null,
  right: SettingsOverviewDraft | null,
) {
  if (!left || !right) {
    return false;
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

function integrationTone(status: IntegrationStatus["status"]) {
  switch (status) {
    case "ready":
      return "success";
    case "partial":
      return "warning";
    default:
      return "neutral";
  }
}

function integrationLabel(status: IntegrationStatus["status"]) {
  switch (status) {
    case "ready":
      return "已接通";
    case "partial":
      return "待补齐";
    default:
      return "未配置";
  }
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    corpId: "Corp ID",
    agentId: "Agent ID",
    secret: "Secret",
    token: "回调 Token",
    aesKey: "AES Key",
    calendarId: "日历 ID",
    region: "Region",
    bucket: "Bucket",
    secretId: "Secret ID",
    secretKey: "Secret Key",
    uploadPrefix: "上传目录前缀",
  };

  return labels[field] ?? field;
}

export default function SettingsPage() {
  const currentUser = getCurrentUser();
  const [data, setData] = useState<SettingsOverviewResponse | null>(null);
  const [draft, setDraft] = useState<SettingsOverviewDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      const response = await fetchSettingsOverview();
      setData(response);
      setDraft(toSettingsDraft(response));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "系统设置加载失败",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  const initialDraft = useMemo(
    () => (data ? toSettingsDraft(data) : null),
    [data],
  );

  const dirty = useMemo(
    () => !sameDraft(draft, initialDraft),
    [draft, initialDraft],
  );

  useUnsavedChangesGuard(dirty);

  const latestUpdatedAt = useMemo(() => {
    if (!data) {
      return "";
    }

    return [
      data.companyProfile.updatedAt,
      data.notificationPolicy.updatedAt,
      data.workspacePreferences.updatedAt,
    ]
      .filter(Boolean)
      .sort()
      .at(-1);
  }, [data]);

  const integrationSummary = useMemo(() => {
    if (!data) {
      return { ready: 0, partial: 0, missing: 0 };
    }

    const statuses = [data.integrations.wecom.status, data.integrations.cos.status];
    return {
      ready: statuses.filter((item) => item === "ready").length,
      partial: statuses.filter((item) => item === "partial").length,
      missing: statuses.filter((item) => item === "missing").length,
    };
  }, [data]);

  async function handleSave() {
    if (!draft) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await updateSettingsOverview(draft);
      setData(response);
      setDraft(toSettingsDraft(response));
      setMessage("系统设置已保存");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "系统设置保存失败",
      );
    } finally {
      setSaving(false);
    }
  }

  function resetToSaved() {
    if (!initialDraft) {
      return;
    }

    if (dirty && !window.confirm("当前有未保存修改，确定恢复到最近一次保存内容吗？")) {
      return;
    }

    setDraft(initialDraft);
    setMessage("");
    setError("");
  }

  if (loading && !draft) {
    return (
      <div className="workspace-stack">
        <WorkspacePageHeader
          description="正在加载系统设置、通知策略与集成状态。"
          eyebrow="系统配置"
          meta={[
            { label: "当前账号", value: currentUser?.displayName ?? "未登录" },
            { label: "角色", value: currentUser?.roleName ?? "未知" },
          ]}
          title="设置"
        />
        <section className="panel stack">
          <div className="small muted">正在加载设置中心...</div>
        </section>
      </div>
    );
  }

  if (!draft || !data) {
    return (
      <div className="workspace-stack">
        <WorkspacePageHeader
          description="设置中心暂时无法加载，请稍后刷新。"
          eyebrow="系统配置"
          meta={[
            { label: "当前账号", value: currentUser?.displayName ?? "未登录" },
            { label: "角色", value: currentUser?.roleName ?? "未知" },
          ]}
          title="设置"
        />
        <section className="panel stack">
          <div className="danger-text small">{error || "系统设置加载失败"}</div>
        </section>
      </div>
    );
  }

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        description="把原来的展示型设置页改成真正可保存的控制台，先承接公司信息、通知策略、工作区默认值，并把敏感集成改为只读状态显示。"
        eyebrow="系统配置"
        meta={[
          { label: "当前账号", value: currentUser?.displayName ?? "未登录" },
          { label: "角色", value: currentUser?.roleName ?? "未知" },
          { label: "最近保存", value: formatDateTime(latestUpdatedAt) },
        ]}
        title="设置"
      />

      {error ? <div className="danger-text small">{error}</div> : null}
      {message ? <div className="success-text small">{message}</div> : null}

      <section className="split-workspace">
        <div className="workspace-main">
          <SectionCard
            actions={
              <div className="inline-actions">
                <button
                  className="button secondary"
                  onClick={resetToSaved}
                  type="button"
                >
                  恢复已保存
                </button>
                <button
                  className="button"
                  disabled={!dirty || saving}
                  onClick={() => void handleSave()}
                  type="button"
                >
                  {saving ? "保存中..." : "保存设置"}
                </button>
              </div>
            }
            description="这里保存的是系统默认值与运营配置，不直接写入环境变量或服务器密钥。"
            title="设置总览"
          >
            <div className="grid-2">
              <SummaryCard title="公司信息">
                <div className="summary-list">
                  <div className="summary-row">
                    <span>公司简称</span>
                    <strong>{draft.companyProfile.shortName || "未填写"}</strong>
                  </div>
                  <div className="summary-row">
                    <span>报价有效期</span>
                    <strong>{draft.companyProfile.quotationValidityDays} 天</strong>
                  </div>
                  <div className="small muted">
                    最近更新：{formatDateTime(data.companyProfile.updatedAt)}
                  </div>
                </div>
              </SummaryCard>

              <SummaryCard title="通知策略">
                <div className="summary-list">
                  <div className="summary-row">
                    <span>审批通知</span>
                    <strong>
                      {draft.notificationPolicy.enableApprovalNotifications ? "开启" : "关闭"}
                    </strong>
                  </div>
                  <div className="summary-row">
                    <span>汇总时间</span>
                    <strong>
                      {draft.notificationPolicy.dailyDigestEnabled
                        ? `${String(draft.notificationPolicy.dailyDigestHour).padStart(2, "0")}:00`
                        : "未开启"}
                    </strong>
                  </div>
                  <div className="small muted">
                    最近更新：{formatDateTime(data.notificationPolicy.updatedAt)}
                  </div>
                </div>
              </SummaryCard>

              <SummaryCard title="工作区默认值">
                <div className="summary-list">
                  <div className="summary-row">
                    <span>日程默认视图</span>
                    <strong>
                      {draft.workspacePreferences.defaultScheduleView === "week"
                        ? "周视图"
                        : "月视图"}
                    </strong>
                  </div>
                  <div className="summary-row">
                    <span>测试工具</span>
                    <strong>
                      {draft.workspacePreferences.enableTestDataTools ? "显示" : "隐藏"}
                    </strong>
                  </div>
                  <div className="small muted">
                    最近更新：{formatDateTime(data.workspacePreferences.updatedAt)}
                  </div>
                </div>
              </SummaryCard>
            </div>
          </SectionCard>

          <SectionCard
            description="报价默认值、对外联系信息和页脚文案先集中在这里，不再散落在页面常量里。"
            title="公司信息"
          >
            <div className="form-grid">
              <div className="field">
                <label htmlFor="settings-company-name">公司全称</label>
                <input
                  id="settings-company-name"
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            companyProfile: {
                              ...current.companyProfile,
                              companyName: event.target.value,
                            },
                          }
                        : current,
                    )
                  }
                  value={draft.companyProfile.companyName}
                />
              </div>

              <div className="field">
                <label htmlFor="settings-short-name">公司简称</label>
                <input
                  id="settings-short-name"
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            companyProfile: {
                              ...current.companyProfile,
                              shortName: event.target.value,
                            },
                          }
                        : current,
                    )
                  }
                  value={draft.companyProfile.shortName}
                />
              </div>

              <div className="field">
                <label htmlFor="settings-service-phone">服务热线</label>
                <input
                  id="settings-service-phone"
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            companyProfile: {
                              ...current.companyProfile,
                              servicePhone: event.target.value,
                            },
                          }
                        : current,
                    )
                  }
                  placeholder="例如：400-000-0000"
                  value={draft.companyProfile.servicePhone}
                />
              </div>

              <div className="field">
                <label htmlFor="settings-support-wechat">客服微信</label>
                <input
                  id="settings-support-wechat"
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            companyProfile: {
                              ...current.companyProfile,
                              supportWechat: event.target.value,
                            },
                          }
                        : current,
                    )
                  }
                  placeholder="例如：huigui-service"
                  value={draft.companyProfile.supportWechat}
                />
              </div>

              <div className="field">
                <label htmlFor="settings-quotation-validity">报价默认有效期</label>
                <input
                  id="settings-quotation-validity"
                  min={1}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            companyProfile: {
                              ...current.companyProfile,
                              quotationValidityDays: Number(event.target.value || 1),
                            },
                          }
                        : current,
                    )
                  }
                  type="number"
                  value={String(draft.companyProfile.quotationValidityDays)}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="settings-quotation-footer">报价页脚说明</label>
              <textarea
                id="settings-quotation-footer"
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          companyProfile: {
                            ...current.companyProfile,
                            quotationFooter: event.target.value,
                          },
                        }
                      : current,
                  )
                }
                rows={4}
                value={draft.companyProfile.quotationFooter}
              />
            </div>
          </SectionCard>

          <SectionCard
            description="先统一管理系统提醒、讨论提醒和审批提醒，后续再逐步把更多消息行为接进来。"
            title="通知策略"
          >
            <div className="grid-2">
              <div className="stack">
                <label className="toggle-row">
                  <span>开启系统通知</span>
                  <input
                    checked={draft.notificationPolicy.enableSystemNotifications}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              notificationPolicy: {
                                ...current.notificationPolicy,
                                enableSystemNotifications: event.target.checked,
                              },
                            }
                          : current,
                      )
                    }
                    type="checkbox"
                  />
                </label>

                <label className="toggle-row">
                  <span>开启评论 / 留言提醒</span>
                  <input
                    checked={draft.notificationPolicy.enableDiscussionNotifications}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              notificationPolicy: {
                                ...current.notificationPolicy,
                                enableDiscussionNotifications: event.target.checked,
                              },
                            }
                          : current,
                      )
                    }
                    type="checkbox"
                  />
                </label>

                <label className="toggle-row">
                  <span>开启审批提醒</span>
                  <input
                    checked={draft.notificationPolicy.enableApprovalNotifications}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              notificationPolicy: {
                                ...current.notificationPolicy,
                                enableApprovalNotifications: event.target.checked,
                              },
                            }
                          : current,
                      )
                    }
                    type="checkbox"
                  />
                </label>

                <label className="toggle-row">
                  <span>开启每日日报</span>
                  <input
                    checked={draft.notificationPolicy.dailyDigestEnabled}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              notificationPolicy: {
                                ...current.notificationPolicy,
                                dailyDigestEnabled: event.target.checked,
                              },
                            }
                          : current,
                      )
                    }
                    type="checkbox"
                  />
                </label>
              </div>

              <div className="stack">
                <div className="field">
                  <label htmlFor="settings-digest-hour">每日日报推送时间</label>
                  <input
                    id="settings-digest-hour"
                    max={23}
                    min={0}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              notificationPolicy: {
                                ...current.notificationPolicy,
                                dailyDigestHour: Number(event.target.value || 0),
                              },
                            }
                          : current,
                      )
                    }
                    type="number"
                    value={String(draft.notificationPolicy.dailyDigestHour)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="settings-reminder-hours">临近到期提前提醒</label>
                  <input
                    id="settings-reminder-hours"
                    max={168}
                    min={1}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              notificationPolicy: {
                                ...current.notificationPolicy,
                                dueSoonReminderHours: Number(event.target.value || 1),
                              },
                            }
                          : current,
                      )
                    }
                    type="number"
                    value={String(draft.notificationPolicy.dueSoonReminderHours)}
                  />
                </div>

                <div className="summary-card">
                  <div className="summary-list">
                    <div className="summary-row">
                      <span>当前摘要</span>
                      <StatusBadge tone="warning">
                        {draft.notificationPolicy.dailyDigestEnabled ? "日报已开启" : "日报未开启"}
                      </StatusBadge>
                    </div>
                    <div className="small muted">
                      审批提醒
                      {draft.notificationPolicy.enableApprovalNotifications ? "已开启" : "已关闭"}
                      ，到期前 {draft.notificationPolicy.dueSoonReminderHours} 小时提醒。
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            description="先维护工作区层面的系统默认值，后续再逐页把这些偏好真正接入交互逻辑。"
            title="工作区偏好"
          >
            <div className="form-grid">
              <div className="field">
                <label htmlFor="settings-schedule-view">日程默认视图</label>
                <select
                  id="settings-schedule-view"
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            workspacePreferences: {
                              ...current.workspacePreferences,
                              defaultScheduleView: event.target.value as "week" | "month",
                            },
                          }
                        : current,
                    )
                  }
                  value={draft.workspacePreferences.defaultScheduleView}
                >
                  <option value="week">周视图</option>
                  <option value="month">月视图</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="settings-dashboard-density">工作台密度</label>
                <select
                  id="settings-dashboard-density"
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            workspacePreferences: {
                              ...current.workspacePreferences,
                              dashboardDensity: event.target.value as
                                | "comfortable"
                                | "compact",
                            },
                          }
                        : current,
                    )
                  }
                  value={draft.workspacePreferences.dashboardDensity}
                >
                  <option value="comfortable">舒展</option>
                  <option value="compact">紧凑</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <label className="toggle-row">
                <span>保留首次引导提示</span>
                <input
                  checked={draft.workspacePreferences.showFirstRunGuides}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            workspacePreferences: {
                              ...current.workspacePreferences,
                              showFirstRunGuides: event.target.checked,
                            },
                          }
                        : current,
                    )
                  }
                  type="checkbox"
                />
              </label>

              <label className="toggle-row">
                <span>显示测试数据工具</span>
                <input
                  checked={draft.workspacePreferences.enableTestDataTools}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            workspacePreferences: {
                              ...current.workspacePreferences,
                              enableTestDataTools: event.target.checked,
                            },
                          }
                        : current,
                    )
                  }
                  type="checkbox"
                />
              </label>
            </div>
          </SectionCard>
        </div>

        <aside className="workspace-side sticky-side">
          <SummaryCard
            description="敏感凭证继续走服务器环境变量，这里只负责给管理员一个可视化状态。"
            title="集成状态"
          >
            <div className="stack">
              {[data.integrations.wecom, data.integrations.cos].map((item) => (
                <article className="summary-card" key={item.name}>
                  <div className="summary-list">
                    <div className="summary-row">
                      <strong>{item.name}</strong>
                      <StatusBadge tone={integrationTone(item.status)}>
                        {integrationLabel(item.status)}
                      </StatusBadge>
                    </div>
                    <div className="small muted">{item.note}</div>
                    <div className="small muted">
                      已配置：
                      {item.configuredFields.length
                        ? item.configuredFields.map(fieldLabel).join("、")
                        : "无"}
                    </div>
                    <div className="small muted">
                      待补齐：
                      {item.missingFields.length
                        ? item.missingFields.map(fieldLabel).join("、")
                        : "无"}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </SummaryCard>

          <SummaryCard title="当前状态">
            <div className="summary-list">
              <div className="summary-row">
                <span>运行环境</span>
                <strong>{data.runtime.nodeEnv}</strong>
              </div>
              <div className="summary-row">
                <span>已接通集成</span>
                <strong>{integrationSummary.ready}</strong>
              </div>
              <div className="summary-row">
                <span>待补齐集成</span>
                <strong>{integrationSummary.partial + integrationSummary.missing}</strong>
              </div>
              <div className="summary-row">
                <span>未保存修改</span>
                <strong>{dirty ? "有" : "无"}</strong>
              </div>
            </div>
          </SummaryCard>

          <SummaryCard title="常用入口">
            <div className="stack">
              <Link className="button secondary" href="/settings/finance-accounts">
                财务账户配置
              </Link>
              <Link className="button secondary" href="/management">
                返回管理中心
              </Link>
              <Link className="button secondary" href="/files">
                打开档案中心
              </Link>
            </div>
          </SummaryCard>
        </aside>
      </section>
    </div>
  );
}
