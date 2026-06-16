"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ManagementDrawer } from "../../../../components/management/ManagementDrawer";
import { ManagementPageToolbar } from "../../../../components/management/ManagementPageToolbar";
import { useSiteBrandKey } from "../../../../components/system/SiteBrandContext";
import {
  ActionMenu,
  EmptyState,
  FilterBar,
  SectionCard,
  StatusBadge,
  SummaryCard,
} from "../../../../components/system/primitives";
import { apiFetch } from "../../../../lib/api";

type MemberRecord = {
  id: string;
  name: string;
  loginAccount?: string | null;
  mobile?: string | null;
  email?: string | null;
  wecomUserId?: string | null;
  wecomName?: string | null;
  wecomAvatar?: string | null;
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
    riskLevel?: "HIGH" | "MEDIUM" | "NORMAL";
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

type WecomDirectoryMember = {
  userid: string;
  name: string;
  departmentNames: string[];
  boundUser?: {
    id: string;
    name: string;
    loginAccount?: string | null;
  } | null;
};

type WecomDirectoryResponse = {
  items: WecomDirectoryMember[];
};

type MemberFormState = {
  name: string;
  mobile: string;
  email: string;
  loginAccount: string;
  department: string;
  title: string;
  managerUserId: string;
  roleId: string;
  dataScope: string;
  status: "ACTIVE" | "DISABLED";
  note: string;
};

type SortValue = "lastLoginDesc" | "createdDesc" | "status";
type WecomBindingFilter = "" | "bound" | "unbound";

type MemberAlert = {
  key: string;
  label: string;
  tone: "neutral" | "warning" | "danger";
};

const LONG_INACTIVE_DAYS = 45;
const PASSWORD_REQUIREMENT_LABEL = "至少 8 位，并同时包含字母和数字";

const emptyForm: MemberFormState = {
  name: "",
  mobile: "",
  email: "",
  loginAccount: "",
  department: "",
  title: "",
  managerUserId: "",
  roleId: "",
  dataScope: "OWNED",
  status: "ACTIVE",
  note: "",
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
    hour12: false,
  }).format(new Date(value));
}

function daysSince(value?: string | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((Date.now() - new Date(value).getTime()) / (24 * 60 * 60 * 1000));
}

function memberAlerts(member: MemberRecord): MemberAlert[] {
  const alerts: MemberAlert[] = [];

  if (!member.mobile && !member.email) {
    alerts.push({ key: "missing-contact", label: "联系方式缺失", tone: "warning" });
  }

  if (member.status === "ACTIVE" && !member.wecomUserId) {
    alerts.push({ key: "wecom-unbound", label: "企业微信未绑定", tone: "warning" });
  }

  if (!member.department || !member.title) {
    alerts.push({ key: "profile-missing", label: "资料待补充", tone: "neutral" });
  }

  if (!["SUPER_ADMIN", "ADMIN"].includes(member.role.code) && member.dataScope === "ALL") {
    alerts.push({ key: "scope-risk", label: "数据范围异常", tone: "danger" });
  }

  if (!member.lastLoginAt) {
    alerts.push({ key: "never-login", label: "尚未登录", tone: "warning" });
  } else if (daysSince(member.lastLoginAt) >= LONG_INACTIVE_DAYS) {
    alerts.push({ key: "inactive", label: "长期未登录", tone: "warning" });
  }

  return alerts;
}

function validateMemberPassword(password: string) {
  const normalized = password.trim();

  if (normalized.length < 8) {
    return PASSWORD_REQUIREMENT_LABEL;
  }

  if (!/[A-Za-z]/.test(normalized) || !/\d/.test(normalized)) {
    return PASSWORD_REQUIREMENT_LABEL;
  }

  return "";
}

export default function ManagementMembersPage() {
  const brandKey = useSiteBrandKey();
  const isManagementBrand = brandKey === "management";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<MemberListResponse | null>(null);
  const [rolesData, setRolesData] = useState<RolesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null);
  const [drawerMode, setDrawerMode] = useState<"view" | "create" | "edit">("view");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formState, setFormState] = useState<MemberFormState>(emptyForm);
  const [passwordInput, setPasswordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [status, setStatus] = useState("");
  const [dataScope, setDataScope] = useState("");
  const [wecomBinding, setWecomBinding] = useState<WecomBindingFilter>("");
  const [sortBy, setSortBy] = useState<SortValue>("lastLoginDesc");
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);
  const [wecomSearchKeyword, setWecomSearchKeyword] = useState("");
  const [wecomCandidates, setWecomCandidates] = useState<WecomDirectoryMember[]>([]);
  const [wecomSearching, setWecomSearching] = useState(false);
  const [wecomBindingUserId, setWecomBindingUserId] = useState("");
  const [wecomTestSending, setWecomTestSending] = useState(false);

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
      if (wecomBinding) params.set("wecomBinding", wecomBinding);

      const response = await apiFetch<MemberListResponse>(
        `/management/members${params.toString() ? `?${params.toString()}` : ""}`,
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
    } catch {
      // Keep member list usable even if role options are temporarily unavailable.
    }
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
    [members],
  );

  const visibleMembers = useMemo(() => {
    let next = [...members];

    if (onlyAbnormal) {
      next = next.filter((member) => memberAlerts(member).length > 0);
    }

    next.sort((left, right) => {
      if (sortBy === "status") {
        const leftStatusScore = left.status === "ACTIVE" ? 0 : 1;
        const rightStatusScore = right.status === "ACTIVE" ? 0 : 1;
        if (leftStatusScore !== rightStatusScore) {
          return leftStatusScore - rightStatusScore;
        }
      }

      if (sortBy === "createdDesc") {
        return (
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        );
      }

      const leftTime = left.lastLoginAt ? new Date(left.lastLoginAt).getTime() : 0;
      const rightTime = right.lastLoginAt ? new Date(right.lastLoginAt).getTime() : 0;

      return rightTime - leftTime;
    });

    return next;
  }, [members, onlyAbnormal, sortBy]);

  const memberStats = useMemo(() => {
    const activeCount = members.filter((member) => member.status === "ACTIVE").length;
    const disabledCount = members.filter((member) => member.status === "DISABLED").length;
    const abnormalCount = members.filter((member) => memberAlerts(member).length > 0).length;
    const neverLoginCount = members.filter((member) => !member.lastLoginAt).length;
    const wecomBoundCount = members.filter((member) => Boolean(member.wecomUserId)).length;
    const wecomUnboundActiveCount = members.filter(
      (member) => member.status === "ACTIVE" && !member.wecomUserId,
    ).length;

    return {
      activeCount,
      disabledCount,
      abnormalCount,
      neverLoginCount,
      wecomBoundCount,
      wecomUnboundActiveCount,
    };
  }, [members]);

  function openCreateDrawer() {
    setDrawerMode("create");
    setSelectedMember(null);
    setWecomCandidates([]);
    setWecomSearchKeyword("");
    setFormState({
      ...emptyForm,
      roleId: roleOptions[0]?.id ?? "",
      dataScope: roleOptions[0]?.defaultDataScope ?? "OWNED",
    });
    setPasswordInput("");
    setDrawerOpen(true);
  }

  async function openMemberDrawer(id: string, mode: "view" | "edit") {
    setDrawerMode(mode);
    setDrawerOpen(true);
    setError("");
    setSelectedMember(null);
    setWecomCandidates([]);
    setWecomSearchKeyword("");

    try {
      const response = await apiFetch<MemberDetail>(`/management/members/${id}`);
      setSelectedMember(response);
      setPasswordInput("");
      if (mode === "edit") {
        setFormState({
          name: response.name,
          mobile: response.mobile || "",
          email: response.email || "",
          loginAccount: response.loginAccount || "",
          department: response.department || "",
          title: response.title || "",
          managerUserId: response.manager?.id || "",
          roleId: response.role.id,
          dataScope: response.dataScope,
          status: response.status,
          note: "",
        });
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "成员详情加载失败");
    }
  }

  useEffect(() => {
    const memberId = searchParams.get("memberId");
    if (!memberId || !members.some((member) => member.id === memberId)) {
      return;
    }

    void openMemberDrawer(memberId, "view").then(() => {
      router.replace("/management/members");
    });
  }, [members, router, searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      if (drawerMode === "create") {
        const passwordError = validateMemberPassword(passwordInput);

        if (passwordError) {
          setError(`初始密码${passwordError}`);
          return;
        }

        await apiFetch("/management/members", {
          method: "POST",
          body: JSON.stringify({
            ...formState,
            managerUserId: formState.managerUserId || undefined,
            password: passwordInput.trim(),
          }),
        });
        setMessage("成员已创建");
      }

      if (drawerMode === "edit" && selectedMember) {
        await apiFetch(`/management/members/${selectedMember.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...formState,
            managerUserId: formState.managerUserId || undefined,
          }),
        });
        setMessage("成员已保存");
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

    if (!window.confirm("确定重置该成员密码吗？")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const passwordError = validateMemberPassword(passwordInput);

      if (passwordError) {
        setError(`重置后的密码${passwordError}`);
        return;
      }

      await apiFetch(`/management/members/${selectedMember.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({
          password: passwordInput.trim(),
        }),
      });
      await openMemberDrawer(selectedMember.id, "view");
      setMessage("成员密码已重置");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "密码重置失败");
    }
  }

  async function handleClearWecomBinding(member: MemberRecord) {
    if (!member.wecomUserId) {
      setMessage("该成员当前没有企业微信绑定");
      return;
    }

    const confirmed = window.confirm(
      `确定清除 ${member.name} 的企业微信绑定吗？清除后该成员需要重新扫码登录完成绑定。`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiFetch(`/management/members/${member.id}/wecom/unbind`, {
        method: "POST",
      });
      await loadMembers();
      if (selectedMember?.id === member.id) {
        await openMemberDrawer(member.id, "view");
      }
      setMessage("企业微信绑定已清除");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "企业微信绑定清除失败");
    }
  }

  async function handleSearchWecomMembers() {
    const keyword = wecomSearchKeyword.trim();

    setError("");
    setMessage("");
    setWecomSearching(true);

    try {
      const params = new URLSearchParams();
      if (keyword) {
        params.set("keyword", keyword);
      }

      const response = await apiFetch<WecomDirectoryResponse>(
        `/management/wecom/members${params.toString() ? `?${params.toString()}` : ""}`,
      );
      setWecomCandidates(response.items);
      if (!response.items.length) {
        setMessage("没有找到匹配的企业微信成员");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "企业微信成员搜索失败");
    } finally {
      setWecomSearching(false);
    }
  }

  async function handleBindWecomMember(member: MemberRecord, candidate: WecomDirectoryMember) {
    if (candidate.boundUser && candidate.boundUser.id !== member.id) {
      setError(`该企业微信成员已绑定到 ${candidate.boundUser.name}`);
      return;
    }

    const confirmed = window.confirm(
      `确定将 ${candidate.name} 绑定到 CRM 成员 ${member.name} 吗？`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setWecomBindingUserId(candidate.userid);

    try {
      await apiFetch(`/management/members/${member.id}/wecom/bind`, {
        method: "POST",
        body: JSON.stringify({
          userid: candidate.userid,
        }),
      });
      await loadMembers();
      await openMemberDrawer(member.id, "view");
      setWecomCandidates([]);
      setWecomSearchKeyword("");
      setMessage("企业微信绑定已更新");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "企业微信绑定失败");
    } finally {
      setWecomBindingUserId("");
    }
  }

  async function handleSendWecomTestMessage(member: MemberRecord) {
    if (!member.wecomUserId) {
      setError("该成员尚未绑定企业微信");
      return;
    }

    setError("");
    setMessage("");
    setWecomTestSending(true);

    try {
      await apiFetch(`/management/members/${member.id}/wecom/test-message`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setMessage("企业微信测试通知已发送");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "企业微信测试通知发送失败");
    } finally {
      setWecomTestSending(false);
    }
  }

  async function handleToggleStatus(member: MemberRecord) {
    const nextStatus = member.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    const confirmed = window.confirm(
      member.status === "ACTIVE"
        ? "停用后该成员将无法继续登录，确定停用吗？"
        : "确定重新启用该成员账号吗？",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiFetch(`/management/members/${member.id}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: nextStatus,
        }),
      });
      await loadMembers();
      if (selectedMember?.id === member.id) {
        await openMemberDrawer(member.id, "view");
      }
      setMessage("账号状态已更新");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "账号状态更新失败");
    }
  }

  const selectedAlerts = selectedMember ? memberAlerts(selectedMember) : [];

  return (
    <div className="workspace-stack management-members-page">
      <ManagementPageToolbar
        note="先筛出异常成员，再处理角色、账号状态和数据范围边界。"
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
        meta={[
          { label: "启用成员", value: String(memberStats.activeCount), tone: memberStats.activeCount ? "success" : "neutral" },
          { label: "企业微信未绑定", value: String(memberStats.wecomUnboundActiveCount), tone: memberStats.wecomUnboundActiveCount ? "warning" : "neutral" },
          { label: "异常成员", value: String(memberStats.abnormalCount), tone: memberStats.abnormalCount ? "warning" : "neutral" },
          { label: "停用成员", value: String(memberStats.disabledCount), tone: memberStats.disabledCount ? "danger" : "neutral" },
        ]}
      />

      {error ? <div className="danger-text small">{error}</div> : null}
      {message ? <div className="success-text small">{message}</div> : null}

      <SummaryCard
        title="成员状态摘要"
        description={
          memberStats.abnormalCount > 0
            ? `当前有 ${memberStats.abnormalCount} 名成员需要复核，优先检查长期未登录、数据范围异常和资料缺失账号。`
            : "当前成员状态稳定，可以继续通过筛选工具定位具体账号。"
        }
        actions={
          <button
            className="button ghost inline"
            onClick={() => setOnlyAbnormal((current) => !current)}
            type="button"
          >
            {onlyAbnormal ? "查看全部成员" : "仅看异常成员"}
          </button>
        }
      >
        <div className="management-summary-banner__stats">
          <div className="management-summary-banner__stat">
            <span>企业微信已绑定</span>
            <strong>{memberStats.wecomBoundCount}</strong>
          </div>
          <div className="management-summary-banner__stat">
            <span>企业微信未绑定</span>
            <strong>{memberStats.wecomUnboundActiveCount}</strong>
          </div>
          <div className="management-summary-banner__stat">
            <span>尚未登录</span>
            <strong>{memberStats.neverLoginCount}</strong>
          </div>
          <div className="management-summary-banner__stat">
            <span>长期未登录</span>
            <strong>
              {
                members.filter(
                  (member) =>
                    Boolean(member.lastLoginAt) &&
                    daysSince(member.lastLoginAt) >= LONG_INACTIVE_DAYS,
                ).length
              }
            </strong>
          </div>
          <div className="management-summary-banner__stat">
            <span>资料缺失</span>
            <strong>
              {
                members.filter(
                  (member) => !member.mobile && !member.email,
                ).length
              }
            </strong>
          </div>
        </div>
      </SummaryCard>

      <SectionCard title="筛选与排序" description="搜索姓名、账号和联系方式，再按角色、状态和数据范围快速定位目标成员。">
        <FilterBar
          actions={
            <>
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
                  setWecomBinding("");
                  setSortBy("lastLoginDesc");
                  setOnlyAbnormal(false);
                }}
                type="button"
              >
                清空筛选
              </button>
            </>
          }
        >
          <div className="field filter-field filter-field--wide">
            <label htmlFor="member-keyword">搜索</label>
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
          <div className="field filter-field">
            <label htmlFor="member-wecom-binding">企业微信</label>
            <select
              id="member-wecom-binding"
              onChange={(event) => setWecomBinding(event.target.value as WecomBindingFilter)}
              value={wecomBinding}
            >
              <option value="">全部绑定状态</option>
              <option value="bound">已绑定</option>
              <option value="unbound">未绑定</option>
            </select>
          </div>
          <div className="field filter-field">
            <label htmlFor="member-sort">排序</label>
            <select id="member-sort" onChange={(event) => setSortBy(event.target.value as SortValue)} value={sortBy}>
              <option value="lastLoginDesc">最近登录</option>
              <option value="createdDesc">创建时间</option>
              <option value="status">状态优先</option>
            </select>
          </div>
          <label className="toggle-row management-filter-toggle">
            <input checked={onlyAbnormal} onChange={(event) => setOnlyAbnormal(event.target.checked)} type="checkbox" />
            <span>仅看异常成员</span>
          </label>
        </FilterBar>
      </SectionCard>

      <SectionCard
        title="成员列表"
        description="优先查看姓名、角色、状态、数据范围和最近登录，再决定查看详情或直接处理。"
      >
        {visibleMembers.length ? (
          <div className="table-wrap management-table-wrap">
            <table className="dense-table management-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>账号</th>
                  <th>企业微信</th>
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
                {visibleMembers.map((member) => {
                  const alerts = memberAlerts(member);
                  const rowClassName = [
                    "management-table__row",
                    member.status === "DISABLED" ? "member-row--disabled" : "",
                    alerts.length ? "member-row--warning" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr className={rowClassName} key={member.id}>
                      <td>
                        <div className="member-name-cell">
                          <strong>{member.name}</strong>
                          {alerts.length ? (
                            <div className="member-alerts">
                              {alerts.map((alert) => (
                                <StatusBadge key={alert.key} tone={alert.tone}>
                                  {alert.label}
                                </StatusBadge>
                              ))}
                            </div>
                          ) : (
                            <div className="small muted">当前状态稳定</div>
                          )}
                        </div>
                      </td>
                      <td>{member.loginAccount || "--"}</td>
                      <td>
                        <div className="member-role-cell">
                          <StatusBadge tone={member.wecomUserId ? "success" : "warning"}>
                            {member.wecomUserId ? "已绑定" : "未绑定"}
                          </StatusBadge>
                          <div className="small muted">
                            {member.wecomName || member.wecomUserId || "待扫码绑定"}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{member.mobile || "--"}</div>
                        <div className="small muted">{member.email || "--"}</div>
                      </td>
                      <td>{member.department || "--"}</td>
                      <td>{member.title || "--"}</td>
                      <td>
                        <div className="member-role-cell">
                          <strong>{member.role.name}</strong>
                          <div className="small muted">{member.role.code}</div>
                        </div>
                      </td>
                      <td>
                        <StatusBadge tone={member.dataScope === "ALL" && !["SUPER_ADMIN", "ADMIN"].includes(member.role.code) ? "danger" : "neutral"}>
                          {member.dataScopeLabel}
                        </StatusBadge>
                      </td>
                      <td>
                        <StatusBadge tone={member.status === "ACTIVE" ? "success" : "neutral"}>
                          {member.status === "ACTIVE" ? "启用" : "停用"}
                        </StatusBadge>
                      </td>
                      <td>
                        <div>{formatDate(member.lastLoginAt)}</div>
                        {member.lastLoginAt ? (
                          <div className="small muted">{daysSince(member.lastLoginAt)} 天前</div>
                        ) : (
                          <div className="small muted">尚未登录</div>
                        )}
                      </td>
                      <td>{formatDate(member.createdAt)}</td>
                      <td>
                        <div className="table-actions">
                          <button className="button secondary inline" onClick={() => void openMemberDrawer(member.id, "view")} type="button">
                            查看
                          </button>
                          <button className="button ghost inline" onClick={() => void openMemberDrawer(member.id, "edit")} type="button">
                            编辑
                          </button>
                          <ActionMenu
                            items={[
                              {
                                label: "重置密码",
                                onClick: () => {
                                  setPasswordInput("");
                                  void openMemberDrawer(member.id, "view");
                                },
                              },
                              ...(member.wecomUserId
                                ? [
                                    {
                                      label: "清除企业微信绑定",
                                      onClick: () => {
                                        void handleClearWecomBinding(member);
                                      },
                                      tone: "danger" as const,
                                    },
                                  ]
                                : [
                                    {
                                      label: "绑定企业微信",
                                      onClick: () => {
                                        void openMemberDrawer(member.id, "view");
                                      },
                                    },
                                  ]),
                              {
                                label: member.status === "ACTIVE" ? "停用" : "启用",
                                onClick: () => {
                                  void handleToggleStatus(member);
                                },
                                tone: member.status === "ACTIVE" ? "danger" : "default",
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={loading ? "正在加载成员" : "当前没有符合条件的成员"}
            description={
              loading
                ? "成员列表正在同步，请稍候。"
                : "调整筛选条件后再试，或直接新增成员。"
            }
            action={
              !loading ? (
                <button className="button inline" onClick={openCreateDrawer} type="button">
                  新增成员
                </button>
              ) : null
            }
          />
        )}
      </SectionCard>

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
              {selectedMember.wecomUserId ? (
                <button
                  className="button ghost inline"
                  onClick={() => void handleClearWecomBinding(selectedMember)}
                  type="button"
                >
                  清除企业微信绑定
                </button>
              ) : null}
            </>
          ) : undefined
        }
        onClose={() => {
          setDrawerOpen(false);
          setSelectedMember(null);
          setPasswordInput("");
          setWecomCandidates([]);
          setWecomSearchKeyword("");
          setWecomBindingUserId("");
          setWecomTestSending(false);
        }}
        open={drawerOpen}
        subtitle={
          drawerMode === "create"
            ? "在抽屉内完成基础资料、角色和数据范围配置。"
            : drawerMode === "edit"
              ? "直接调整成员资料、角色与状态。"
              : "查看成员权限摘要、异常提示和最近操作。"
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
                <div>
                  <span>企业微信状态</span>
                  <strong>{selectedMember.wecomUserId ? "已绑定" : "未绑定"}</strong>
                </div>
                <div>
                  <span>企业微信成员</span>
                  <strong>{selectedMember.wecomName || selectedMember.wecomUserId || "--"}</strong>
                </div>
                <div><span>部门</span><strong>{selectedMember.department || "--"}</strong></div>
                <div><span>职位</span><strong>{selectedMember.title || "--"}</strong></div>
                <div><span>直属上级</span><strong>{selectedMember.manager?.name || "--"}</strong></div>
                <div><span>创建人</span><strong>{selectedMember.createdByUser?.name || "--"}</strong></div>
              </div>
            </section>

            <section className="drawer-section">
              <h4>企业微信绑定</h4>
              {selectedMember.wecomUserId ? (
                <div className="stack compact-gap">
                  <div className="detail-grid">
                    <div><span>绑定状态</span><strong>已绑定</strong></div>
                    <div><span>企业微信成员</span><strong>{selectedMember.wecomName || selectedMember.wecomUserId}</strong></div>
                    <div><span>UserID</span><strong>{selectedMember.wecomUserId}</strong></div>
                  </div>
                  <div className="inline-actions">
                    <button
                      className="button secondary inline"
                      disabled={wecomTestSending}
                      onClick={() => void handleSendWecomTestMessage(selectedMember)}
                      type="button"
                    >
                      {wecomTestSending ? "发送中..." : "发送测试通知"}
                    </button>
                    <button
                      className="button ghost inline"
                      onClick={() => void handleClearWecomBinding(selectedMember)}
                      type="button"
                    >
                      清除绑定
                    </button>
                  </div>
                </div>
              ) : (
                <div className="stack compact-gap">
                  <div className="field">
                    <label htmlFor="member-wecom-search">搜索企业微信成员</label>
                    <div className="inline-actions">
                      <input
                        id="member-wecom-search"
                        onChange={(event) => setWecomSearchKeyword(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleSearchWecomMembers();
                          }
                        }}
                        placeholder="姓名 / userid / 部门"
                        value={wecomSearchKeyword}
                      />
                      <button
                        className="button secondary inline"
                        disabled={wecomSearching}
                        onClick={() => void handleSearchWecomMembers()}
                        type="button"
                      >
                        {wecomSearching ? "搜索中..." : "搜索"}
                      </button>
                    </div>
                  </div>

                  {wecomCandidates.length ? (
                    <div className="stack compact-gap">
                      {wecomCandidates.map((candidate) => {
                        const disabled = Boolean(
                          candidate.boundUser && candidate.boundUser.id !== selectedMember.id,
                        );

                        return (
                          <div className="detail-log" key={candidate.userid}>
                            <div className="summary-row">
                              <div>
                                <strong>{candidate.name}</strong>
                                <div className="small muted">
                                  {candidate.userid} · {candidate.departmentNames.join(" / ") || "未设置部门"}
                                </div>
                                {candidate.boundUser ? (
                                  <div className="small muted">
                                    已绑定：{candidate.boundUser.name}
                                    {candidate.boundUser.loginAccount ? ` / ${candidate.boundUser.loginAccount}` : ""}
                                  </div>
                                ) : null}
                              </div>
                              <button
                                className="button inline"
                                disabled={disabled || wecomBindingUserId === candidate.userid}
                                onClick={() => void handleBindWecomMember(selectedMember, candidate)}
                                type="button"
                              >
                                {candidate.boundUser?.id === selectedMember.id
                                  ? "已绑定"
                                  : wecomBindingUserId === candidate.userid
                                    ? "绑定中..."
                                    : "绑定"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="small muted">输入关键词后搜索企业微信通讯录成员。</div>
                  )}
                </div>
              )}
            </section>

            <section className="drawer-section">
              <h4>异常提示</h4>
              {selectedAlerts.length ? (
                <div className="member-alerts">
                  {selectedAlerts.map((alert) => (
                    <StatusBadge key={alert.key} tone={alert.tone}>
                      {alert.label}
                    </StatusBadge>
                  ))}
                </div>
              ) : (
                <div className="small muted">当前没有异常提示。</div>
              )}
            </section>

            <section className="drawer-section">
              <h4>权限信息</h4>
              <div className="detail-grid">
                <div><span>当前角色</span><strong>{selectedMember.role.name}</strong></div>
                <div><span>数据范围</span><strong>{selectedMember.dataScopeLabel}</strong></div>
                <div><span>可导出 PDF</span><strong>{selectedMember.permissionSummary.canExportPdf ? "是" : "否"}</strong></div>
                {isManagementBrand ? (
                  <div><span>站点范围</span><strong>大爱归心协同</strong></div>
                ) : (
                  <>
                    <div><span>可审批折扣</span><strong>{selectedMember.permissionSummary.canApproveDiscount ? "是" : "否"}</strong></div>
                    <div><span>可查看全部客户</span><strong>{selectedMember.permissionSummary.canViewAllCustomers ? "是" : "否"}</strong></div>
                  </>
                )}
                <div><span>账号状态</span><strong>{selectedMember.status === "ACTIVE" ? "启用" : "停用"}</strong></div>
              </div>
              {isManagementBrand ? (
                <div className="small muted">
                  客户、报价等 CRM 业务权限不在大爱归心站点内展示。
                </div>
              ) : null}
            </section>

            <section className="drawer-section">
              <h4>使用信息</h4>
              <div className="detail-grid">
                <div><span>最近登录</span><strong>{formatDate(selectedMember.lastLoginAt)}</strong></div>
                <div><span>创建时间</span><strong>{formatDate(selectedMember.createdAt)}</strong></div>
              </div>
              <div className="stack compact-gap mt-12">
                {selectedMember.recentLogs.length ? (
                  selectedMember.recentLogs.map((log) => (
                    <div className="detail-log" key={log.id}>
                      <div className="summary-row">
                        <strong>{log.module} · {log.action}</strong>
                        {log.riskLevel ? (
                          <StatusBadge tone={log.riskLevel === "HIGH" ? "danger" : log.riskLevel === "MEDIUM" ? "warning" : "neutral"}>
                            {log.riskLevel === "HIGH" ? "高风险" : log.riskLevel === "MEDIUM" ? "关注" : "常规"}
                          </StatusBadge>
                        ) : null}
                      </div>
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
                  placeholder={PASSWORD_REQUIREMENT_LABEL}
                  type="password"
                  value={passwordInput}
                />
                <div className="small muted">为避免固定口令扩散，重置密码时必须手动输入新密码。</div>
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
                {drawerMode === "create" ? (
                  <div className="field">
                    <label htmlFor="member-password">初始密码</label>
                    <input
                      id="member-password"
                      onChange={(event) => setPasswordInput(event.target.value)}
                      placeholder={PASSWORD_REQUIREMENT_LABEL}
                      type="password"
                      value={passwordInput}
                    />
                    <div className="small muted">请为成员设置一次性初始密码，登录后再按制度更换。</div>
                  </div>
                ) : null}
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
                        dataScope: nextRole?.defaultDataScope || current.dataScope,
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
              <div className="small muted">成员级权限暂不单独覆盖，模块可见性默认跟随角色配置。</div>
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
              <button
                className="button secondary inline"
                onClick={() => {
                  setDrawerOpen(false);
                  setSelectedMember(null);
                  setPasswordInput("");
                }}
                type="button"
              >
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
