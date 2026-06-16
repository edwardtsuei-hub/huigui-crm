"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WorkspacePageHeader } from "../dashboard/WorkspacePageHeader";
import {
  EmptyState,
  SectionCard,
  StatusBadge,
} from "../system/primitives";
import {
  apiFetch,
  getCurrentUser,
  hasPermission,
  type CurrentUser,
} from "../../lib/api";

const TEMPLATE_PATH = "/embedded/shift-scheduler-v9.html";
const ORIGINAL_HINT =
  "这是免部署版：数据只保存在当前设备当前浏览器。发给同事后，他们各自独立使用。现在支持班表、活动日历、备注、预约信息一起显示和导出。";
const EMBEDDED_HINT =
  "已接入洄归协同系统：当前版本会把班表保存到云端共享数据，同时保留浏览器本地缓存，可继续编辑班表、活动备注与预约并导出图片。";

const SHIFT_ROSTER_SAVE_MESSAGE = "huigui-shift-roster-save";
const SHIFT_ROSTER_COMMAND_MESSAGE = "huigui-shift-roster-command";
const MANAGEMENT_COMPANY_FOOTNOTE =
  "適用公司：歸心之旅、光的家園、熊抱大地、道沖元氣、洄歸生態科技";

type ShiftRosterConfig = Record<string, unknown>;

type ShiftRosterResponse = {
  config: ShiftRosterConfig;
  updatedAt: string | null;
  updatedBy: {
    id: string;
    name: string;
    roleName: string;
  } | null;
};

type EmbeddedUser = Pick<
  CurrentUser,
  "id" | "username" | "displayName" | "name" | "permissions" | "roleCode"
>;

function escapeForInlineScript(value: string) {
  return value.replace(/</g, "\\u003c");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "尚未同步";
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

function buildBootstrapScript(
  user: EmbeddedUser | null,
  config: ShiftRosterConfig,
  canEdit: boolean,
  updatedAt: string | null,
  updatedByName: string | null,
) {
  const payload = escapeForInlineScript(
    JSON.stringify({
      canEdit,
      displayName: user?.displayName ?? user?.name ?? user?.username ?? "系统成员",
      id: user?.id ?? "embedded-user",
      name: user?.name ?? user?.displayName ?? user?.username ?? "系统成员",
      sharedConfig: config,
      updatedAt,
      updatedByName,
      username: user?.username ?? "embedded-user",
    }),
  );

  return `<script>
(function () {
  var injectedUser = ${payload};

  function bootstrapShiftScheduler() {
    try {
      var displayName =
        injectedUser.displayName ||
        injectedUser.name ||
        injectedUser.username ||
        "系统成员";

      if (!ROLES.viewer) {
        ROLES.viewer = {
          name: "查看者",
          editDepts: []
        };
      }

      var originalRenderTabs = renderTabs;
      renderTabs = function () {
        originalRenderTabs();

        if (injectedUser.canEdit) {
          return;
        }

        var nav = document.getElementById("tabNav");
        if (!nav) {
          return;
        }

        Array.from(nav.querySelectorAll(".tab-btn")).forEach(function (button) {
          var label = button.textContent || "";
          if (label.indexOf("人员管理") >= 0 || label.indexOf("设置") >= 0) {
            button.remove();
          }
        });

        if (CTab === "staff" || CTab === "settings") {
          CTab = "sched_" + getVisibleDepts()[0];
        }
      };

      var originalRenderSettings = renderSettings;
      renderSettings = function () {
        originalRenderSettings();

        var appContent = document.getElementById("appContent");
        if (!appContent) {
          return;
        }

        Array.from(appContent.querySelectorAll(".panel")).forEach(function (panel) {
          var text = panel.textContent || "";
          if (text.indexOf("管理员账号") >= 0) {
            panel.remove();
          }
        });

        var note = document.createElement("div");
        note.className = "tipbox";
        note.textContent =
          "系统版已启用统一登录和云端共享保存；内置管理员账号不再使用。最近一次云端更新：" +
          (injectedUser.updatedAt || "尚未同步") +
          (injectedUser.updatedByName ? "，操作人：" + injectedUser.updatedByName : "");
        appContent.insertBefore(note, appContent.firstChild);
      };

      saveDB = function () {
        localStorage.setItem(STORE_KEY, JSON.stringify(DB));

        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(
              {
                type: "${SHIFT_ROSTER_SAVE_MESSAGE}",
                payload: DB
              },
              "*"
            );
          }
        } catch (error) {}
      };

      window.addEventListener("message", function (event) {
        var data = event.data && typeof event.data === "object" ? event.data : null;
        if (!data || data.type !== "${SHIFT_ROSTER_COMMAND_MESSAGE}") {
          return;
        }

        if (data.action === "export-image" && typeof genImg === "function") {
          var activeDept =
            CTab && CTab.indexOf("sched_") === 0
              ? CTab.replace("sched_", "")
              : getVisibleDepts()[0];

          if (activeDept) {
            genImg(activeDept);
          }
        }
      });

      DB = mergeDB(injectedUser.sharedConfig || DB || {}, defaultDB());
      localStorage.setItem(STORE_KEY, JSON.stringify(DB));

      ME = {
        id: injectedUser.id || "embedded-user",
        username: injectedUser.username || "embedded-user",
        password: "",
        name: displayName,
        role: injectedUser.canEdit ? "superadmin" : "viewer"
      };

      var loginScreen = document.getElementById("loginScreen");
      if (loginScreen) {
        loginScreen.style.display = "none";
      }

      var roleBadge = document.getElementById("roleBadge");
      if (roleBadge) {
        roleBadge.textContent =
          (injectedUser.canEdit ? "系统班表协同" : "班表查看模式") +
          " · " +
          displayName;
      }

      var headerNote = document.querySelector(".header-note");
      if (headerNote) {
        headerNote.textContent = injectedUser.canEdit
          ? "云端共享保存"
          : "云端共享只读";
      }

      var logoutButton = document.querySelector(".btn-logout");
      if (logoutButton) {
        logoutButton.style.display = "none";
      }

      showOnly("appScreen");
      CTab = CTab || "sched_frontHouse";
      renderTabs();
      renderView();
    } catch (error) {
      var appScreen = document.getElementById("appScreen");
      if (appScreen) {
        appScreen.style.display = "flex";
      }

      var appContent = document.getElementById("appContent");
      if (appContent) {
        appContent.innerHTML =
          '<div class="panel"><div class="empty">班表工具初始化失败，请刷新后重试。</div></div>';
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapShiftScheduler, {
      once: true
    });
  } else {
    bootstrapShiftScheduler();
  }
})();
</script>`;
}

function buildEmbeddedHtml(
  template: string,
  user: EmbeddedUser | null,
  config: ShiftRosterConfig,
  canEdit: boolean,
  updatedAt: string | null,
  updatedByName: string | null,
) {
  const patchedTemplate = template.replace(ORIGINAL_HINT, EMBEDDED_HINT);
  const injectedScript = buildBootstrapScript(
    user,
    config,
    canEdit,
    updatedAt,
    updatedByName,
  );

  if (patchedTemplate.includes("</body>")) {
    return patchedTemplate.replace("</body>", `${injectedScript}</body>`);
  }

  return `${patchedTemplate}${injectedScript}`;
}

export function ShiftSchedulerEmbedded() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const pendingSaveTimerRef = useRef<number | null>(null);
  const latestPayloadRef = useRef<ShiftRosterConfig | null>(null);
  const [frameHtml, setFrameHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [canEdit, setCanEdit] = useState(false);
  const [syncState, setSyncState] = useState<"loading" | "idle" | "saving" | "saved" | "error">(
    "loading",
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedByName, setUpdatedByName] = useState<string | null>(null);

  async function persistSharedRoster(config: ShiftRosterConfig) {
    setSyncState("saving");

    try {
      const response = await apiFetch<ShiftRosterResponse>("/settings/shift-roster", {
        method: "PATCH",
        body: JSON.stringify({ config }),
      });

      setUpdatedAt(response.updatedAt);
      setUpdatedByName(response.updatedBy?.name ?? null);
      setSyncState("saved");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "班表云端保存失败",
      );
      setSyncState("error");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadTemplate() {
      setLoading(true);
      setSyncState("loading");
      setError("");

      try {
        const [templateResponse, rosterResponse] = await Promise.all([
          fetch(`${TEMPLATE_PATH}?v=${Date.now()}-${reloadVersion}`),
          apiFetch<ShiftRosterResponse>("/settings/shift-roster"),
        ]);

        if (!templateResponse.ok) {
          throw new Error("班表模板加载失败");
        }

        const template = await templateResponse.text();
        const currentUser = getCurrentUser();
        const canEdit = hasPermission(currentUser, "action.schedule.update");

        if (!cancelled) {
          setCanEdit(canEdit);
          latestPayloadRef.current = rosterResponse.config;
          setUpdatedAt(rosterResponse.updatedAt);
          setUpdatedByName(rosterResponse.updatedBy?.name ?? null);
          setFrameHtml(
            buildEmbeddedHtml(
              template,
              currentUser,
              rosterResponse.config,
              canEdit,
              rosterResponse.updatedAt,
              rosterResponse.updatedBy?.name ?? null,
            ),
          );
          setSyncState(rosterResponse.updatedAt ? "saved" : "idle");
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "班表工具加载失败",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTemplate();

    return () => {
      cancelled = true;
    };
  }, [reloadVersion]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const data =
        event.data && typeof event.data === "object"
          ? (event.data as { type?: string; payload?: ShiftRosterConfig })
          : null;

      if (!data || data.type !== SHIFT_ROSTER_SAVE_MESSAGE || !data.payload) {
        return;
      }

      latestPayloadRef.current = data.payload;
      setError("");
      setSyncState("saving");

      if (pendingSaveTimerRef.current !== null) {
        window.clearTimeout(pendingSaveTimerRef.current);
      }

      pendingSaveTimerRef.current = window.setTimeout(() => {
        pendingSaveTimerRef.current = null;
        if (latestPayloadRef.current) {
          void persistSharedRoster(latestPayloadRef.current);
        }
      }, 500);
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (pendingSaveTimerRef.current !== null) {
        window.clearTimeout(pendingSaveTimerRef.current);
      }
    };
  }, []);

  const meta = useMemo(
    () => [
      { label: "接入方式", value: "系统内嵌" },
      { label: "数据保存", value: "云端共享 + 本地缓存" },
      { label: "图片导出", value: "JPG" },
      {
        label: "云端状态",
        value:
          syncState === "saving"
            ? "保存中"
            : syncState === "saved"
              ? "已同步"
              : syncState === "error"
                ? "同步失败"
                : "待同步",
      },
    ],
    [syncState],
  );

  function sendFrameCommand(action: "export-image") {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: SHIFT_ROSTER_COMMAND_MESSAGE,
        action,
      },
      "*",
    );
  }

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        actions={
          <div className="action-row">
            {canEdit ? (
              <button
                className="button secondary inline"
                disabled={!latestPayloadRef.current || syncState === "saving"}
                onClick={() =>
                  latestPayloadRef.current
                    ? void persistSharedRoster(latestPayloadRef.current)
                    : undefined
                }
                type="button"
              >
                立即同步云端
              </button>
            ) : null}
            <button
              className="button inline"
              disabled={loading || !frameHtml}
              onClick={() => sendFrameCommand("export-image")}
              type="button"
            >
              生成当前班表图片
            </button>
            <button
              className="button secondary inline"
              onClick={() => setReloadVersion((current) => current + 1)}
              type="button"
            >
              重新加载班表工具
            </button>
          </div>
        }
        description="沿用现有系统登录，把你提供的班表管理、活动日历、备注预约和 JPG 导出一起放进正式入口。"
        eyebrow="班表管理"
        meta={meta}
        title="班表管理"
      />

      <SectionCard
        description="这一版已经把班表数据接入云端共享存储，团队打开同一个入口看到的是同一份班表；图片导出仍在当前浏览器完成。"
        title="当前版本说明"
      >
        <div className="action-row" style={{ justifyContent: "space-between", gap: 12 }}>
          <div className="action-row" style={{ gap: 8 }}>
            <StatusBadge tone="success">已接入系统登录</StatusBadge>
            <StatusBadge tone="success">已启用云端共享</StatusBadge>
            <StatusBadge tone="neutral">支持活动 / 备注 / 预约</StatusBadge>
          </div>
          <div className="small muted">
            最近同步：{formatDateTime(updatedAt)}
            {updatedByName ? ` · ${updatedByName}` : ""}
          </div>
        </div>
      </SectionCard>

      {error ? (
        <section className="panel stack">
          <EmptyState
            action={
              <button
                className="button secondary inline"
                onClick={() => setReloadVersion((current) => current + 1)}
                type="button"
              >
                重试加载
              </button>
            }
            description={error}
            title="班表工具暂时没有加载出来"
          />
        </section>
      ) : null}

      {!error ? (
        <section className="panel stack">
          {loading || !frameHtml ? (
            <div className="empty-state-card">
              <strong>正在装载班表工具</strong>
              <span>第一次进入会先载入模板，再自动套用当前系统登录身份。</span>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              key={reloadVersion}
              srcDoc={frameHtml}
              style={{
                background: "#ffffff",
                border: "0",
                borderRadius: 24,
                minHeight: 1240,
                width: "100%",
              }}
              title="班表管理工具"
            />
          )}

          <div className="small muted">{MANAGEMENT_COMPANY_FOOTNOTE}</div>
        </section>
      ) : null}
    </div>
  );
}
