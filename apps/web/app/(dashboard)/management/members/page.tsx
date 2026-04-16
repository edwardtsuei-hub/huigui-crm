"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkspacePageHeader } from "../../../../components/dashboard/WorkspacePageHeader";
import { ManagementDrawer } from "../../../../components/management/ManagementDrawer";
import { apiFetch } from "../../../../lib/api";

type MemberRecord = {
  id: string;
  name: string;
  loginAccount?: string | null;
  mobile?: string | null;
  email?: string | null;
  department?: string | null;
  title?: string | null;
  dataScope: string;
  dataScopeLabel: string;
  status: "ACTIVE" | "DISABLED";
  role: { id: string; code: string; name: string };
  manager?: { id: string; name: string } | null;
  createdByUser?: { id: string; name: string } | null;
  lastLoginAt?: string | null;
  createdAt: string;
  permissionSummary: {
    canExportPdf: boolean;
    canApproveDiscount: boolean;
    canViewAllCustomers: boolean;
  };
};

type MemberDetail = MemberRecord & {
  recentLogs: Array<{
    id: string;
    createdAt: string;
    action: string;
    module: string;
    content?: string | null;
    afterSummary?: string | null;
  }>;
};

type MemberListResponse = {
  items: MemberRecord[];
  filters: {
    departments: string[];
    statuses: string[];
    dataScopes: Array<{ value: string; label: string }>;
  };
};

type RolesResponse = {
  roles: Array<{
    id: string;
    name: string;
    code: string;
    defaultDataScope: string;
    memberCount: number;
  }>;
};

type MemberFormState = {
  name: string;
  mobile: string;
  email: string;
  loginAccount: string;
  password: string;
  department: string;
  title: string;
  managerUserId: string;
  roleId: string;
  dataScope: string;
  status: "ACTIVE" | "DISABLED";
  note: string;
};

const emptyForm: MemberFormState = {
  name: "",
  mobile: "",
  email: "",
  loginAccount: "",
  password: "Huigui@123",
  department: "",
  title: "",
  managerUserId: "",
  roleId: "",
  dataScope: "OWNED",
  status: "ACTIVE",
  note: ""
};

function formatDate(value?: string | null) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export default function ManagementMembersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<MemberListResponse | null>(null);
  const [rolesData, setRolesData] = useState<RolesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null);
  const [drawerMode, setDrawerMode] = useState<"view" | "create" | "edit">("view");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formState, setFormState] = useState<MemberFormState>(emptyForm);
  const [passwordInput, setPasswordInput] = useState("Huigui@123");
  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [status, setStatus] = useState("");
  const [dataScope, setDataScope] = useState("");

  const members = data?.items ?? [];
  const roleOptions = rolesData?.roles ?? [];

  async function loadMembers() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (department) params.set("department", department);
      if (roleCode) params.set("roleCode", roleCode);
      if (status) params.set("status", status);
      if (dataScope) params.set("dataScope", dataScope);

      const response = await apiFetch<MemberListResponse>(
        `/management/members${params.toString() ? `?${params.toString()}` : ""}`
      );
      setData(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "成员列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadRoles() {
    try {
      const response = await apiFetch<RolesResponse>("/management/roles");
      setRolesData(response);
    } catch {}
  }

  useEffect(() => {
    void Promise.all([loadMembers(), loadRoles()]);
  }, []);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      openCreateDrawer();
      router.replace("/management/members");
    }
  }, [router, searchParams]);

  const managerOptions = useMemo(
    () => members.map((member) => ({ id: member.id, name: member.name })),
    [members]
  );

  function openCreateDrawer() {
    setDrawerMode("create");
    setSelectedMember(null);
    setFormState({
      ...emptyForm,
      roleId: roleOptions[0]?.id ?? "",
      dataScope: roleOptions[0]?.defaultDataScope ?? "OWNED"
    });
    setPasswordInput("Huigui@123");
    setDrawerOpen(true);
  }

  async function openMemberDrawer(id: string, mode: "view" | "edit") {
    setDrawerMode(mode);
    setDrawerOpen(true);
    setError("");

    try {
      const response = await apiFetch<MemberDetail>(`/management/members/${id}`);
      setSelectedMember(response);
      setPasswordInput("Huigui@123");
      if (mode === "edit") {
        setFormState({
          name: response.name,
          mobile: response.mobile || "",
          email: response.email || "",
          loginAccount: response.loginAccount || "",
          password: "Huigui@123",
          department: response.department || "",
          title: response.title || "",
          managerUserId: response.manager?.id || "",
          roleId: response.role.id,
          dataScope: response.dataScope,
          status: response.status,
          note: ""
        });
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "成员详情加载失败");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      if (drawerMode === "create") {
        await apiFetch("/management/members", {
          method: "POST",
          body: JSON.stringify({
            ...formState,
            managerUserId: formState.managerUserId || undefined,
            password: passwordInput
          })
        });
      }

      if (drawerMode === "edit" && selectedMember) {
        await apiFetch(`/management/members/${selectedMember.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...formState,
            managerUserId: formState.managerUserId || undefined
          })
        });
      }

      await loadMembers();
      setDrawerOpen(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "成员保存失败");
    }
  }

  async function handleResetPassword() {
    if (!selectedMember) {
      return;
    }

    try {
      await apiFetch(`/management/members/${selectedMember.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password: passwordInput })
      });
      await openMemberDrawer(selectedMember.id, "view");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "密码重置失败");
    }
  }

  async function handleToggleStatus(member: MemberRecord) {
    try {
      await apiFetch(`/management/members/${member.id}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: member.status === "ACTIVE" ? "DISABLED" : "ACTIVE"
        })
      });
      await loadMembers();
      if (selectedMember?.id === member.id) {
        await openMemberDrawer(member.id, "view");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "账号状态更新失败");
    }
  }

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        title="成员管理"
        eyebrow="Members"
        description="统一管理系统成员、角色分配与数据权限，页面保持高密度 SaaS 人员管理结构，不再使用介绍型大段文字。"
        actions={
          <>
            <button className="button secondary inline" onClick={() => void loadMembers()} type="button">
              刷新列表
            </button>
            <button className="button inline" onClick={openCreateDrawer} type="button">
              新增成员
            </button>
          </>
        }
      />

      <section className="panel stack">
        <div className="filter-row">
          <div className="field filter-field filter-field--wide">
            <label htmlFor="member-keyword">成员搜索</label>
            <input
              id="member-keyword"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="姓名 / 手机 / 邮箱 / 账号"
              value={keyword}
            />
          </div>
          <div className="field filter-field">
            <label htmlFor="member-department">部门</label>
            <select id="member-department" onChange={(event) => setDepartment(event.target.value)} value={department}>
              <option value="">全部部门</option>
              {data?.filters.departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="field filter-field">
            <label htmlFor="member-role">角色</label>
            <select id="member-role" onChange={(event) => setRoleCode(event.target.value)} value={roleCode}>
              <option value="">全部角色</option>
              {roleOptions.map((role) => (
                <option key={role.id} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field filter-field">
            <label htmlFor="member-status">状态</label>
            <select id="member-status" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="">全部状态</option>
              <option value="ACTIVE">启用</option>
              <option value="DISABLED">停用</option>
            </select>
          </div>
          <div className="field filter-field">
            <label htmlFor="member-scope">数据范围</label>
            <select id="member-scope" onChange={(event) => setDataScope(event.target.value)} value={dataScope}>
              <option value="">全部范围</option>
              {data?.filters.dataScopes.map((scope) => (
                <option key={scope.value} value={scope.value}>
                  {scope.label}
                </option>
              ))}
            </select>
          </div>
          <div className="action-row">
            <button className="button secondary inline" onClick={() => void loadMembers()} type="button">
              应用筛选
            </button>
            <button
              className="button ghost inline"
              onClick={() => {
                setKeyword("");
                setDepartment("");
                setRoleCode("");
                setStatus("");
                setDataScope("");
              }}
              type="button"
            >
              清空筛选
            </button>
          </div>
        </div>

        {error ? <div className="danger-text small">{error}</div> : null}

        <div className="table-wrap">
          <table className="dense-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>账号</th>
                <th>手机 / 邮箱</th>
                <th>部门</th>
                <th>职位</th>
                <th>角色</th>
                <th>数据范围</th>
                <th>状态</th>
                <th>最近登录</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {members.length ? (
                members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <strong>{member.name}</strong>
                    </td>
                    <td>{member.loginAccount || "--"}</td>
                    <td>
                      <div>{member.mobile || "--"}</div>
                      <div className="small muted">{member.email || "--"}</div>
                    </td>
                    <td>{member.department || "--"}</td>
                    <td>{member.title || "--"}</td>
                    <td>{member.role.name}</td>
                    <td>{member.dataScopeLabel}</td>
                    <td>
                      <span className={`status-pill ${member.status === "ACTIVE" ? "success" : "neutral"}`}>
                        {member.status === "ACTIVE" ? "启用" : "停用"}
                      </span>
                    </td>
                    <td>{formatDate(member.lastLoginAt)}</td>
                    <td>{formatDate(member.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button className="button secondary inline" onClick={() => void openMemberDrawer(member.id, "view")} type="button">
                          查看
                        </button>
                        <button className="button secondary inline" onClick={() => void openMemberDrawer(member.id, "edit")} type="button">
                          编辑
                        </button>
                        <button className="button ghost inline" onClick={() => {
                          setPasswordInput("Huigui@123");
                          void openMemberDrawer(member.id, "view");
                        }} type="button">
                          重置密码
                        </button>
                        <button
                          className={`button ${member.status === "ACTIVE" ? "ghost" : "secondary"} inline`}
                          onClick={() => void handleToggleStatus(member)}
                          type="button"
                        >
                          {member.status === "ACTIVE" ? "停用" : "启用"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11}>
                    <div className="empty">{loading ? "正在加载成员..." : "当前筛选条件下没有成员记录。"}</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ManagementDrawer
        actions={
          drawerMode === "view" && selectedMember ? (
            <>
              <button
                className="button secondary inline"
                onClick={() => void openMemberDrawer(selectedMember.id, "edit")}
                type="button"
              >
                编辑成员
              </button>
              <button className="button inline" onClick={handleResetPassword} type="button">
                重置密码
              </button>
            </>
          ) : undefined
        }
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        subtitle={
          drawerMode === "create"
            ? "在右侧抽屉内完成基础资料、角色和数据范围配置。"
            : drawerMode === "edit"
              ? "直接在抽屉内调整成员资料、角色与状态。"
              : "查看成员权限摘要、使用信息与最近操作。"
        }
        title={drawerMode === "create" ? "新增成员" : drawerMode === "edit" ? "编辑成员" : selectedMember?.name || "成员详情"}
      >
        {drawerMode === "view" && selectedMember ? (
          <div className="stack">
            <section className="drawer-section">
              <h4>基本信息</h4>
              <div className="detail-grid">
                <div><span>姓名</span><strong>{selectedMember.name}</strong></div>
                <div><span>登录账号</span><strong>{selectedMember.loginAccount || "--"}</strong></div>
                <div><span>手机</span><strong>{selectedMember.mobile || "--"}</strong></div>
                <div><span>邮箱</span><strong>{selectedMember.email || "--"}</strong></div>
                <div><span>部门</span><strong>{selectedMember.department || "--"}</strong></div>
                <div><span>职位</span><strong>{selectedMember.title || "--"}</strong></div>
                <div><span>直属上级</span><strong>{selectedMember.manager?.name || "--"}</strong></div>
                <div><span>创建人</span><strong>{selectedMember.createdByUser?.name || "--"}</strong></div>
              </div>
            </section>

            <section className="drawer-section">
              <h4>权限信息</h4>
              <div className="detail-grid">
                <div><span>当前角色</span><strong>{selectedMember.role.name}</strong></div>
                <div><span>数据范围</span><strong>{selectedMember.dataScopeLabel}</strong></div>
                <div><span>可导出 PDF</span><strong>{selectedMember.permissionSummary.canExportPdf ? "是" : "否"}</strong></div>
                <div><span>可审批折扣</span><strong>{selectedMember.permissionSummary.canApproveDiscount ? "是" : "否"}</strong></div>
                <div><span>可查看全部客户</span><strong>{selectedMember.permissionSummary.canViewAllCustomers ? "是" : "否"}</strong></div>
                <div><span>账号状态</span><strong>{selectedMember.status === "ACTIVE" ? "启用" : "停用"}</strong></div>
              </div>
            </section>

            <section className="drawer-section">
              <h4>使用信息</h4>
              <div className="detail-grid">
                <div><span>最近登录</span><strong>{formatDate(selectedMember.lastLoginAt)}</strong></div>
                <div><span>创建时间</span><strong>{formatDate(selectedMember.createdAt)}</strong></div>
              </div>
              <div className="stack compact-gap" style={{ marginTop: 12 }}>
                {selectedMember.recentLogs.length ? (
                  selectedMember.recentLogs.map((log) => (
                    <div className="detail-log" key={log.id}>
                      <strong>{log.module} · {log.action}</strong>
                      <div className="small muted">{formatDate(log.createdAt)}</div>
                      <div className="small muted">{log.afterSummary || log.content || "最近没有更多摘要"}</div>
                    </div>
                  ))
                ) : (
                  <div className="empty">最近还没有成员相关操作记录。</div>
                )}
              </div>
            </section>

            <section className="drawer-section">
              <h4>快捷操作</h4>
              <div className="field">
                <label htmlFor="member-reset-password">重置后的密码</label>
                <input
                  id="member-reset-password"
                  onChange={(event) => setPasswordInput(event.target.value)}
                  value={passwordInput}
                />
              </div>
            </section>
          </div>
        ) : (
          <form className="stack" onSubmit={handleSubmit}>
            <section className="drawer-section">
              <h4>A. 基本资料</h4>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="member-name">姓名</label>
                  <input id="member-name" onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))} value={formState.name} />
                </div>
                <div className="field">
                  <label htmlFor="member-login">登录账号</label>
                  <input id="member-login" onChange={(event) => setFormState((current) => ({ ...current, loginAccount: event.target.value }))} value={formState.loginAccount} />
                </div>
                <div className="field">
                  <label htmlFor="member-mobile">手机</label>
                  <input id="member-mobile" onChange={(event) => setFormState((current) => ({ ...current, mobile: event.target.value }))} value={formState.mobile} />
                </div>
                <div className="field">
                  <label htmlFor="member-email">邮箱</label>
                  <input id="member-email" onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))} value={formState.email} />
                </div>
                <div className="field">
                  <label htmlFor="member-dept">部门</label>
                  <input id="member-dept" onChange={(event) => setFormState((current) => ({ ...current, department: event.target.value }))} value={formState.department} />
                </div>
                <div className="field">
                  <label htmlFor="member-title">职位</label>
                  <input id="member-title" onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))} value={formState.title} />
                </div>
                <div className="field">
                  <label htmlFor="member-manager">直属上级</label>
                  <select id="member-manager" onChange={(event) => setFormState((current) => ({ ...current, managerUserId: event.target.value }))} value={formState.managerUserId}>
                    <option value="">未设置</option>
                    {managerOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="member-password">初始密码</label>
                  <input id="member-password" onChange={(event) => setPasswordInput(event.target.value)} value={passwordInput} />
                </div>
              </div>
            </section>

            <section className="drawer-section">
              <h4>B. 权限配置</h4>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="member-role-id">角色</label>
                  <select
                    id="member-role-id"
                    onChange={(event) => {
                      const nextRole = roleOptions.find((role) => role.id === event.target.value);
                      setFormState((current) => ({
                        ...current,
                        roleId: event.target.value,
                        dataScope: nextRole?.defaultDataScope || current.dataScope
                      }));
                    }}
                    value={formState.roleId}
                  >
                    {roleOptions.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="member-scope-select">数据范围</label>
                  <select id="member-scope-select" onChange={(event) => setFormState((current) => ({ ...current, dataScope: event.target.value }))} value={formState.dataScope}>
                    {data?.filters.dataScopes.map((scope) => (
                      <option key={scope.value} value={scope.value}>
                        {scope.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="small muted">模块可见性与敏感按钮默认跟随角色权限配置，首版先不做成员级单独特权覆盖。</div>
            </section>

            <section className="drawer-section">
              <h4>C. 状态设置</h4>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="member-status-select">账号状态</label>
                  <select id="member-status-select" onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value as "ACTIVE" | "DISABLED" }))} value={formState.status}>
                    <option value="ACTIVE">启用</option>
                    <option value="DISABLED">停用</option>
                  </select>
                </div>
                <div className="field full">
                  <label htmlFor="member-note">备注</label>
                  <textarea id="member-note" onChange={(event) => setFormState((current) => ({ ...current, note: event.target.value }))} value={formState.note} />
                </div>
              </div>
            </section>

            <div className="drawer-footer-actions">
              <button className="button secondary inline" onClick={() => setDrawerOpen(false)} type="button">
                取消
              </button>
              <button className="button inline" type="submit">
                保存
              </button>
            </div>
          </form>
        )}
      </ManagementDrawer>
    </div>
  );
}
