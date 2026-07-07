export const PUBLIC_ENTRY_URL =
  process.env.NEXT_PUBLIC_ENTRY_URL?.replace(/\/$/, "") ?? "https://crm.hui-health.com";

export const PUBLIC_ENTRY_HOST = PUBLIC_ENTRY_URL.replace(/^https?:\/\//, "");

export const PUBLIC_LOGIN_URL = `${PUBLIC_ENTRY_URL}/login`;

export const MANAGEMENT_ENTRY_URL =
  process.env.NEXT_PUBLIC_MANAGEMENT_ENTRY_URL?.replace(/\/$/, "") ??
  "https://management.hui-health.com";

export const MANAGEMENT_ENTRY_HOST = MANAGEMENT_ENTRY_URL.replace(/^https?:\/\//, "");

export const PUBLIC_ENTRY_PATH = "/dashboard";

// Keep a stable entry route so the real homepage can be swapped later
// without changing every login/redirect callsite.
export const MANAGEMENT_ENTRY_PATH = "/work-management/home";
export const EMPLOYEE_MOBILE_ENTRY_PATH = "/mobile";
export const DAOCHONG_MOBILE_ENTRY_PATH = "/daochong-mobile";
export const ECOMMERCE_ENTRY_PATH = "/work-management/ecom-home";
export const COURSE_ENTRY_PATH = "/courses";
export const BEARHUG_ENTRY_PATH = "/calendar";
export const ECOTECH_ENTRY_PATH = "/ecotech";
export const FINANCE_ENTRY_PATH = "/finance/dashboard";

export type EntryResolutionUser = {
  username?: string | null;
  displayName?: string | null;
  name?: string | null;
  loginAccount?: string | null;
  department?: string | null;
  title?: string | null;
  roleCode?: string | null;
  roleName?: string | null;
  wecomName?: string | null;
  wecomUserId?: string | null;
  permissions?: string[] | null;
};

function normalizeEntryHost(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.replace(/^https?:\/\//, "").replace(/\/$/, "").split(":")[0].toLowerCase();
}

export function isManagementEntryHost(host?: string | null) {
  return normalizeEntryHost(host) === normalizeEntryHost(MANAGEMENT_ENTRY_HOST);
}

export function resolveAuthenticatedEntryPath(host?: string | null) {
  return isManagementEntryHost(host) ? MANAGEMENT_ENTRY_PATH : PUBLIC_ENTRY_PATH;
}

function buildUserIdentityText(user?: EntryResolutionUser | null) {
  if (!user) {
    return "";
  }

  return [
    user.username,
    user.displayName,
    user.name,
    user.loginAccount,
    user.department,
    user.title,
    user.roleCode,
    user.roleName,
    user.wecomName,
    user.wecomUserId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasManagementRole(user: EntryResolutionUser) {
  if (["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(user.roleCode ?? "")) {
    return true;
  }

  return Boolean(
    user.permissions?.some((permission) =>
      [
        "menu.management",
        "menu.work_management",
        "page.work_management.weekly_reports",
      ].includes(permission),
    ),
  );
}

function roleCodeOf(user: EntryResolutionUser) {
  return (user.roleCode ?? "").toUpperCase();
}

export function resolveAuthenticatedUserEntryPath(
  user: EntryResolutionUser | null | undefined,
  host?: string | null,
) {
  if (!isManagementEntryHost(host)) {
    return PUBLIC_ENTRY_PATH;
  }

  if (!user) {
    return MANAGEMENT_ENTRY_PATH;
  }

  const identityText = buildUserIdentityText(user);
  const roleCode = roleCodeOf(user);
  if (/founder|创办|創辦|以达|以達|崔以达|崔以達|cuiyida|edwardtsuei|诚恳心/.test(identityText)) {
    return EMPLOYEE_MOBILE_ENTRY_PATH;
  }

  if (/道冲|道沖|daochong/.test(identityText)) {
    return DAOCHONG_MOBILE_ENTRY_PATH;
  }

  if (roleCode === "ECOMMERCE_MANAGER" || /电商|電商|ecommerce|有赞|有讚/.test(identityText)) {
    return ECOMMERCE_ENTRY_PATH;
  }

  if (roleCode === "ECOTECH_MANAGER" || /洄归|洄歸|生态科技|生態科技|ecotech/.test(identityText)) {
    return ECOTECH_ENTRY_PATH;
  }

  if (roleCode === "PRODUCT_SPECIALIST" || /课程|課程|光的家园|光的家園|course/.test(identityText)) {
    return COURSE_ENTRY_PATH;
  }

  if (roleCode === "FINANCE" || /财务|財務|finance/.test(identityText)) {
    return FINANCE_ENTRY_PATH;
  }

  if (roleCode === "BEARHUG_KITCHEN" || /熊抱|bearhug|餐饮|餐飲|前厅|前廳|后厨|後廚|门店|門店/.test(identityText)) {
    return BEARHUG_ENTRY_PATH;
  }

  return hasManagementRole(user) ? MANAGEMENT_ENTRY_PATH : EMPLOYEE_MOBILE_ENTRY_PATH;
}

export function resolveDisplayedEntryHost(host?: string | null) {
  return isManagementEntryHost(host) ? MANAGEMENT_ENTRY_HOST : PUBLIC_ENTRY_HOST;
}
