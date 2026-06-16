"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ManagementDrawer } from "../../../../components/management/ManagementDrawer";
import { ManagementPageToolbar } from "../../../../components/management/ManagementPageToolbar";
import { FirstRunGuide } from "../../../../components/system/FirstRunGuide";
import { useSiteBrandKey } from "../../../../components/system/SiteBrandContext";
import {
  SectionCard,
  StatusBadge,
  SummaryCard,
} from "../../../../components/system/primitives";
import { apiFetch } from "../../../../lib/api";
import {
  managementModuleLabel,
  useUnsavedChangesGuard,
} from "../../../../lib/management";

type RolesResponse = {
  roles: Array<{
    id: string;
    name: string;
    code: string;
    description?: string | null;
    isSystem: boolean;
    defaultDataScope: string;
    defaultPermissionCodes: string[];
    memberCount: number;
    permissionCodes: string[];
  }>;
  permissionCatalog: Array<{
    category: "MENU" | "PAGE" | "ACTION";
    modules: Array<{
      module: string;
      permissions: Array<{ code: string; name: string }>;
    }>;
  }>;
  dataScopes: Array<{ value: string; label: string }>;
};

type RoleFormState = {
  name: string;
  description: string;
  defaultDataScope: string;
  permissionCodes: string[];
};

const emptyRoleForm: RoleFormState = {
  name: "",
  description: "",
  defaultDataScope: "OWNED",
  permissionCodes: [],
};

const moduleDescriptions: Record<string, string> = {
  dashboard: "控制首页与工作台入口",
  work_management: "控制周报、月目标与团队工作管理",
  schedule: "控制提醒、日程和临时任务",
  customers: "控制客户列表、详情和归属动作",
  products: "控制产品与模板维护",
  solutions: "控制方案创建、复制和报价生成",
  quotations: "控制报价编辑、审批和导出",
  files: "控制档案中心与归档资料",
  management: "控制成员、角色、规则与日志",
  settings: "控制系统设置与帮助页",
};

const managementModuleDescriptions: Record<string, string> = {
  dashboard: "控制协同首页与管理入口",
  work_management: "控制周报、本月目标与团队协同页面",
  schedule: "控制协同日程、班表与提醒入口",
  management: "控制成员、角色、通知与日志",
  settings: "控制系统设置与帮助页",
};

const MANAGEMENT_ROLE_VISIBLE_MODULES = new Set([
  "dashboard",
  "work_management",
  "schedule",
  "management",
  "settings",
]);

function getModuleDescription(module: string, isManagementBrand: boolean) {
  if (isManagementBrand) {
    return (
      managementModuleDescriptions[module] ||
      "控制该模块在协同平台里的可见性与执行动作。"
    );
  }

  return moduleDescriptions[module] || "控制该模块的可见性与执行动作。";
}

function samePermissionSet(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();

  return leftSorted.every((item, index) => item === rightSorted[index]);
}

export default function ManagementRolesPage() {
  const brandKey = useSiteBrandKey();
  const isManagementBrand = brandKey === "management";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<RolesResponse | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeRoleId, setActiveRoleId] = useState("");
  const [activeTab, setActiveTab] = useState<"MENU" | "PAGE" | "ACTION" | "DATA">("MENU");
  const [draftForm, setDraftForm] = useState<RoleFormState>(emptyRoleForm);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createForm, setCreateForm] = useState<RoleFormState>(emptyRoleForm);

  async function loadRoles() {
    try {
      const response = await apiFetch<RolesResponse>("/management/roles");
      setData(response);
      setActiveRoleId((current) => current || response.roles[0]?.id || "");
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "角色权限加载失败");
    }
  }

  useEffect(() => {
    void loadRoles();
  }, []);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setDrawerOpen(true);
      router.replace("/management/roles");
    }
  }, [router, searchParams]);

  const activeRole = useMemo(
    () => data?.roles.find((role) => role.id === activeRoleId) ?? null,
    [activeRoleId, data],
  );

  useEffect(() => {
    if (!activeRole) {
      return;
    }

    setDraftForm({
      name: activeRole.name,
      description: activeRole.description || "",
      defaultDataScope: activeRole.defaultDataScope,
      permissionCodes: activeRole.permissionCodes,
    });
  }, [activeRole]);

  const dirty = useMemo(() => {
    if (!activeRole) {
      return false;
    }

    return (
      draftForm.name !== activeRole.name ||
      draftForm.description !== (activeRole.description || "") ||
      draftForm.defaultDataScope !== activeRole.defaultDataScope ||
      !samePermissionSet(draftForm.permissionCodes, activeRole.permissionCodes)
    );
  }, [activeRole, draftForm]);

  useUnsavedChangesGuard(dirty);

  const visibleCatalog = useMemo(() => {
    if (!data || activeTab === "DATA") {
      return [];
    }

    const modules =
      data.permissionCatalog.find((item) => item.category === activeTab)?.modules ??
      [];

    return isManagementBrand
      ? modules.filter((group) => MANAGEMENT_ROLE_VISIBLE_MODULES.has(group.module))
      : modules;
  }, [activeTab, data, isManagementBrand]);

  const roleStats = useMemo(() => {
    const roles = data?.roles ?? [];
    return {
      total: roles.length,
      custom: roles.filter((role) => !role.isSystem).length,
      members: roles.reduce((sum, role) => sum + role.memberCount, 0),
    };
  }, [data?.roles]);

  const activeTabCount = useMemo(() => {
    if (!activeRole || activeTab === "DATA") {
      return 0;
    }

    return visibleCatalog.reduce((sum, group) => {
      return (
        sum +
        group.permissions.filter((permission) =>
          draftForm.permissionCodes.includes(permission.code),
        ).length
      );
    }, 0);
  }, [activeRole, activeTab, draftForm.permissionCodes, visibleCatalog]);

  function confirmLeaveDraft() {
    return !dirty || window.confirm("当前角色有未保存修改，确定要切换吗？");
  }

  function togglePermission(code: string) {
    setDraftForm((current) => {
      const exists = current.permissionCodes.includes(code);
      return {
        ...current,
        permissionCodes: exists
          ? current.permissionCodes.filter((item) => item !== code)
          : current.permissionCodes.concat(code),
      };
    });
  }

  async function handleSave() {
    if (!activeRole) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiFetch(`/management/roles/${activeRole.id}`, {
        method: "PATCH",
        body: JSON.stringify(draftForm),
      });
      await loadRoles();
      setMessage("权限配置已保存");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "角色保存失败");
    }
  }

  async function handleCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await apiFetch("/management/roles", {
        method: "POST",
        body: JSON.stringify(createForm),
      });
      setDrawerOpen(false);
      setCreateForm(emptyRoleForm);
      await loadRoles();
      setMessage("角色已创建");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "新增角色失败");
    }
  }

  function restoreDefault() {
    if (!activeRole) {
      return;
    }

    if (!window.confirm("恢复默认会覆盖当前未保存修改，确定继续吗？")) {
      return;
    }

    setMessage("");
    setDraftForm({
      name: activeRole.name,
      description: activeRole.description || "",
      defaultDataScope: activeRole.defaultDataScope,
      permissionCodes: activeRole.isSystem
        ? activeRole.defaultPermissionCodes
        : activeRole.permissionCodes,
    });
  }

  function resetToSavedVersion() {
    if (!activeRole) {
      return;
    }

    if (dirty && !window.confirm("当前修改尚未保存，确定放弃吗？")) {
      return;
    }

    setMessage("");
    setDraftForm({
      name: activeRole.name,
      description: activeRole.description || "",
      defaultDataScope: activeRole.defaultDataScope,
      permissionCodes: activeRole.permissionCodes,
    });
  }

  return (
    <div className="workspace-stack management-roles-page">
      <ManagementPageToolbar
        note={
          isManagementBrand
            ? "左侧看角色结构，右侧只处理协同平台当前角色的权限与数据范围。"
            : "左侧看角色结构，右侧只处理当前角色的权限与数据范围。"
        }
        actions={
          <>
            <button className="button secondary inline" onClick={() => void loadRoles()} type="button">
              刷新配置
            </button>
            <button className="button inline" onClick={() => setDrawerOpen(true)} type="button">
              新增角色
            </button>
          </>
        }
        meta={[
          { label: "角色总数", value: String(roleStats.total) },
          { label: "自定义角色", value: String(roleStats.custom), tone: roleStats.custom ? "warning" : "neutral" },
          { label: "配置状态", value: dirty ? "有未保存修改" : "已同步", tone: dirty ? "warning" : "success" },
        ]}
      />

      {error ? <div className="danger-text small">{error}</div> : null}
      {message ? <div className="success-text small">{message}</div> : null}

      <FirstRunGuide
        actions={[
          { label: "开始配置", href: "#role-workspace" },
          { label: "新增角色", href: "/management/roles?create=1", variant: "secondary" },
        ]}
        description="先从角色结构开始，再调整菜单、页面、操作和数据范围。保存前不要频繁切换角色，避免未保存修改丢失。"
        guideKey="management-roles"
        steps={[
          {
            label: "左侧先选角色",
            description: "先确认你正在编辑哪个角色，再开始修改权限，避免把设置改到错误的对象上。",
          },
          {
            label: "右侧按分组配置",
            description: "菜单、页面、操作和数据范围是分层的，建议一次只处理一个分组，判断会更清楚。",
          },
          {
            label: "保存前再确认数据范围",
            description: isManagementBrand
              ? "数据范围会直接影响协同首页、周报、日程和通知可见边界，最好在保存前再看一遍。"
              : "数据范围会直接影响客户、报价和日程可见边界，最好在保存前再看一遍。",
          },
        ]}
        title="左边选角色，右边配权限"
      />

      <SummaryCard
        title="当前角色摘要"
        description={
          activeRole
            ? `${activeRole.name} 当前有 ${activeRole.memberCount} 名成员，默认数据范围为 ${draftForm.defaultDataScope}。`
            : "先从左侧选择角色，再进入权限配置工作区。"
        }
        actions={
          dirty ? (
            <StatusBadge tone="warning">有未保存修改</StatusBadge>
          ) : (
            <StatusBadge tone="success">配置已同步</StatusBadge>
          )
        }
      >
        <div className="management-summary-banner__stats">
          <div className="management-summary-banner__stat">
            <span>当前角色成员</span>
            <strong>{activeRole?.memberCount ?? 0}</strong>
          </div>
          <div className="management-summary-banner__stat">
            <span>当前分组已选</span>
            <strong>{activeTab === "DATA" ? 1 : activeTabCount}</strong>
          </div>
          <div className="management-summary-banner__stat">
            <span>角色类型</span>
            <strong>{activeRole?.isSystem ? "系统" : "自定义"}</strong>
          </div>
        </div>
      </SummaryCard>

      <section className="role-shell management-role-shell" id="role-workspace">
        <aside className="role-shell__sidebar panel stack">
          <div className="section-heading">
            <h3>角色列表</h3>
            <p>左侧保留角色结构，右侧专注当前角色的权限配置。</p>
          </div>

          <div className="stack compact-gap">
            {data?.roles.map((role) => (
              <button
                className={`role-card ${role.id === activeRoleId ? "active" : ""}`}
                key={role.id}
                onClick={() => {
                  if (!confirmLeaveDraft()) {
                    return;
                  }
                  setMessage("");
                  setActiveRoleId(role.id);
                }}
                type="button"
              >
                <div className="summary-row">
                  <strong>{role.name}</strong>
                  <StatusBadge tone={role.isSystem ? "neutral" : "success"}>
                    {role.isSystem ? "系统内置" : "自定义"}
                  </StatusBadge>
                </div>
                <div className="small muted">{role.description || "暂无角色说明"}</div>
                <div className="role-card__meta">
                  <span>{role.memberCount} 名成员</span>
                  <span>{role.code}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="role-shell__main panel stack">
          <div className="section-heading">
            <h3>{activeRole?.name || "选择角色"}</h3>
            <p>
              {activeRole?.description ||
                "先从左侧选择角色，然后再配置菜单权限、页面权限、操作权限与数据范围。"}
            </p>
          </div>

          {dirty ? (
            <div className="management-dirty-banner">
              <strong>有未保存修改</strong>
              <span>切换角色或离开页面前，请先保存或取消本次更改。</span>
            </div>
          ) : null}

          <div className="segment-tabs">
            {[
              { key: "MENU", label: "菜单权限" },
              { key: "PAGE", label: "页面权限" },
              { key: "ACTION", label: "操作权限" },
              { key: "DATA", label: "数据范围" },
            ].map((tab) => (
              <button
                className={`segment-tabs__item ${activeTab === tab.key ? "active" : ""}`}
                key={tab.key}
                onClick={() => setActiveTab(tab.key as "MENU" | "PAGE" | "ACTION" | "DATA")}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab !== "DATA" ? (
            <div className="permission-groups">
              {visibleCatalog.map((group) => {
                const selectedCount = group.permissions.filter((permission) =>
                  draftForm.permissionCodes.includes(permission.code),
                ).length;

                return (
                  <section className="permission-group management-permission-group" key={group.module}>
                    <div className="summary-row">
                      <div className="management-permission-group__header">
                        <strong>{managementModuleLabel(group.module)}</strong>
                        <span>{getModuleDescription(group.module, isManagementBrand)}</span>
                        <small>{group.module}</small>
                      </div>
                      <div className="management-permission-group__stats">
                        <StatusBadge tone={selectedCount > 0 ? "success" : "neutral"}>
                          已选 {selectedCount} / {group.permissions.length}
                        </StatusBadge>
                      </div>
                    </div>

                    <div className="permission-grid">
                      {group.permissions.map((permission) => {
                        const checked = draftForm.permissionCodes.includes(permission.code);
                        return (
                          <label className={`permission-item ${checked ? "checked" : ""}`} key={permission.code}>
                            <input
                              checked={checked}
                              onChange={() => togglePermission(permission.code)}
                              type="checkbox"
                            />
                            <span>{permission.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <SectionCard
              description={
                isManagementBrand
                  ? "数据范围会直接影响协同首页、周报、本月目标、日程和通知等核心模块的可见边界。"
                  : "数据范围会直接影响客户、报价、方案、日程和通知等核心模块的可见边界。"
              }
              title="数据范围"
            >
              <div className="scope-card-grid">
                {data?.dataScopes.map((scope) => {
                  const active = draftForm.defaultDataScope === scope.value;
                  return (
                    <button
                      className={`scope-card ${active ? "active" : ""}`}
                      key={scope.value}
                      onClick={() =>
                        setDraftForm((current) => ({
                          ...current,
                          defaultDataScope: scope.value,
                        }))
                      }
                      type="button"
                    >
                      <strong>{scope.label}</strong>
                      <span>
                        {isManagementBrand
                          ? "应用到协同首页、周报、目标、日程和通知。"
                          : "应用到客户、报价、方案、日程和通知。"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SectionCard>
          )}

          <div className="sticky-form-footer">
            <button className="button ghost inline" onClick={restoreDefault} type="button">
              恢复默认
            </button>
            <button className="button secondary inline" onClick={resetToSavedVersion} type="button">
              取消修改
            </button>
            <button className="button inline" disabled={!dirty} onClick={() => void handleSave()} type="button">
              保存权限配置
            </button>
          </div>
        </div>
      </section>

      <ManagementDrawer
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        subtitle="自定义角色会继承当前权限树结构，方便继续细分岗位。"
        title="新增自定义角色"
      >
        <form className="stack" onSubmit={handleCreateRole}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="role-name">角色名称</label>
              <input id="role-name" onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} value={createForm.name} />
            </div>
            <div className="field">
              <label htmlFor="role-scope">默认数据范围</label>
              <select id="role-scope" onChange={(event) => setCreateForm((current) => ({ ...current, defaultDataScope: event.target.value }))} value={createForm.defaultDataScope}>
                {data?.dataScopes.map((scope) => (
                  <option key={scope.value} value={scope.value}>
                    {scope.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field full">
              <label htmlFor="role-description">角色说明</label>
              <textarea id="role-description" onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} value={createForm.description} />
            </div>
          </div>

          <div className="drawer-section">
            <h4>初始权限</h4>
            <div className="permission-groups">
              {data?.permissionCatalog.map((category) => (
                <section className="permission-group" key={category.category}>
                  <div className="summary-row">
                    <strong>
                      {category.category === "MENU"
                        ? "菜单权限"
                        : category.category === "PAGE"
                          ? "页面权限"
                          : "操作权限"}
                    </strong>
                    <span className="small muted">{category.modules.length} 个模块</span>
                  </div>
                  <div className="permission-grid">
                    {category.modules.flatMap((group) =>
                      group.permissions.map((permission) => {
                        const checked = createForm.permissionCodes.includes(permission.code);
                        return (
                          <label className={`permission-item ${checked ? "checked" : ""}`} key={permission.code}>
                            <input
                              checked={checked}
                              onChange={() =>
                                setCreateForm((current) => ({
                                  ...current,
                                  permissionCodes: checked
                                    ? current.permissionCodes.filter((code) => code !== permission.code)
                                    : current.permissionCodes.concat(permission.code),
                                }))
                              }
                              type="checkbox"
                            />
                            <span>{permission.name}</span>
                          </label>
                        );
                      }),
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="drawer-footer-actions">
            <button className="button secondary inline" onClick={() => setDrawerOpen(false)} type="button">
              取消
            </button>
            <button className="button inline" type="submit">
              保存角色
            </button>
          </div>
        </form>
      </ManagementDrawer>
    </div>
  );
}
