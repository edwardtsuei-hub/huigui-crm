"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkspacePageHeader } from "../../../../components/dashboard/WorkspacePageHeader";
import { ManagementDrawer } from "../../../../components/management/ManagementDrawer";
import { apiFetch } from "../../../../lib/api";

type RolesResponse = {
  roles: Array<{
    id: string;
    name: string;
    code: string;
    description?: string | null;
    isSystem: boolean;
    defaultDataScope: string;
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
  permissionCodes: []
};

export default function ManagementRolesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<RolesResponse | null>(null);
  const [error, setError] = useState("");
  const [activeRoleId, setActiveRoleId] = useState("");
  const [activeTab, setActiveTab] = useState<"MENU" | "PAGE" | "ACTION" | "DATA">("MENU");
  const [draftForm, setDraftForm] = useState<RoleFormState>(emptyRoleForm);
  const [dirty, setDirty] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createForm, setCreateForm] = useState<RoleFormState>(emptyRoleForm);

  async function loadRoles() {
    try {
      const response = await apiFetch<RolesResponse>("/management/roles");
      setData(response);
      setActiveRoleId((current) => current || response.roles[0]?.id || "");
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
    [activeRoleId, data]
  );

  useEffect(() => {
    if (!activeRole) {
      return;
    }

    setDraftForm({
      name: activeRole.name,
      description: activeRole.description || "",
      defaultDataScope: activeRole.defaultDataScope,
      permissionCodes: activeRole.permissionCodes
    });
    setDirty(false);
  }, [activeRole]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty]);

  const visibleCatalog = useMemo(() => {
    if (!data) {
      return [];
    }

    if (activeTab === "DATA") {
      return [];
    }

    return data.permissionCatalog.find((item) => item.category === activeTab)?.modules ?? [];
  }, [activeTab, data]);

  function togglePermission(code: string) {
    setDraftForm((current) => {
      const exists = current.permissionCodes.includes(code);
      const nextCodes = exists
        ? current.permissionCodes.filter((item) => item !== code)
        : current.permissionCodes.concat(code);

      return {
        ...current,
        permissionCodes: nextCodes
      };
    });
    setDirty(true);
  }

  async function handleSave() {
    if (!activeRole) {
      return;
    }

    try {
      await apiFetch(`/management/roles/${activeRole.id}`, {
        method: "PATCH",
        body: JSON.stringify(draftForm)
      });
      await loadRoles();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "角色保存失败");
    }
  }

  async function handleCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiFetch("/management/roles", {
        method: "POST",
        body: JSON.stringify(createForm)
      });
      setDrawerOpen(false);
      setCreateForm(emptyRoleForm);
      await loadRoles();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "新增角色失败");
    }
  }

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        title="角色权限"
        eyebrow="Roles & Access"
        description="配置角色可见模块、可执行操作与数据范围，左侧聚焦角色分层，右侧聚焦具体权限。"
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
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="role-shell">
        <aside className="role-shell__sidebar panel stack">
          <div className="section-heading">
            <h3>角色列表</h3>
            <p>系统角色固定在前，自定义角色可继续往下扩展。</p>
          </div>

          <div className="stack compact-gap">
            {data?.roles.map((role) => (
              <button
                className={`role-card ${role.id === activeRoleId ? "active" : ""}`}
                key={role.id}
                onClick={() => setActiveRoleId(role.id)}
                type="button"
              >
                <div className="summary-row">
                  <strong>{role.name}</strong>
                  <span className={`status-pill ${role.isSystem ? "neutral" : "success"}`}>
                    {role.isSystem ? "系统内置" : "自定义"}
                  </span>
                </div>
                <div className="small muted">{role.description || "暂无角色说明"}</div>
                <div className="small muted">{role.memberCount} 名成员</div>
              </button>
            ))}
          </div>
        </aside>

        <div className="role-shell__main panel stack">
          <div className="section-heading">
            <h3>{activeRole?.name || "选择角色"}</h3>
            <p>{activeRole?.description || "在右侧配置菜单、页面、操作与数据范围权限。"}</p>
          </div>

          <div className="segment-tabs">
            {[
              { key: "MENU", label: "菜单权限" },
              { key: "PAGE", label: "页面权限" },
              { key: "ACTION", label: "操作权限" },
              { key: "DATA", label: "数据范围" }
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
              {visibleCatalog.map((group) => (
                <section className="permission-group" key={group.module}>
                  <div className="summary-row">
                    <strong>{group.module}</strong>
                    <span className="small muted">{group.permissions.length} 项</span>
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
              ))}
            </div>
          ) : (
            <section className="data-scope-panel">
              <div className="section-heading">
                <h3>数据范围</h3>
                <p>该数据范围将应用到客户、报价、方案、日程与通知等核心业务模块。</p>
              </div>
              <div className="scope-card-grid">
                {data?.dataScopes.map((scope) => {
                  const active = draftForm.defaultDataScope === scope.value;
                  return (
                    <button
                      className={`scope-card ${active ? "active" : ""}`}
                      key={scope.value}
                      onClick={() => {
                        setDraftForm((current) => ({ ...current, defaultDataScope: scope.value }));
                        setDirty(true);
                      }}
                      type="button"
                    >
                      <strong>{scope.label}</strong>
                      <span>应用于客户、报价、方案、日程、通知。</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div className="sticky-form-footer">
            <button
              className="button ghost inline"
              onClick={() => {
                if (!activeRole) return;
                setDraftForm({
                  name: activeRole.name,
                  description: activeRole.description || "",
                  defaultDataScope: activeRole.defaultDataScope,
                  permissionCodes: activeRole.permissionCodes
                });
                setDirty(false);
              }}
              type="button"
            >
              恢复默认
            </button>
            <button className="button secondary inline" onClick={() => setDirty(false)} type="button">
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
        subtitle="自定义角色会继承当前权限树结构，方便在系统内继续细分岗位。"
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
            <div className="permission-grid">
              {data?.permissionCatalog.flatMap((category) =>
                category.modules.flatMap((group) =>
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
                                : current.permissionCodes.concat(permission.code)
                            }))
                          }
                          type="checkbox"
                        />
                        <span>{permission.name}</span>
                      </label>
                    );
                  })
                )
              )}
            </div>
          </div>

          <div className="drawer-footer-actions">
            <button className="button secondary inline" onClick={() => setDrawerOpen(false)} type="button">
              取消
            </button>
            <button className="button inline" type="submit">
              创建角色
            </button>
          </div>
        </form>
      </ManagementDrawer>
    </div>
  );
}
