import { isManagementEntryHost } from "./public-entry";

export type SiteBrandKey = "public" | "management";

export type SiteBrand = {
  key: SiteBrandKey;
  metadataTitle: string;
  metadataDescription: string;
  loadingTitle: string;
  loadingSubtitle: string;
  sidebarEyebrow: string;
  sidebarTitle: string;
  sidebarSubtitle: string;
  loginCompanyName: string;
  loginSloganLabel: string;
  loginHeroTitleLines: string[];
  loginHeroLead: string;
  loginPanelBadge: string;
  loginPanelTitle: string;
  loginPanelDescription: string;
  loginButtonLabel: string;
  loginFooter: string;
  organizationListLabel: string;
  organizationList: string[];
  visionLabel: string;
  vision: string;
};

export const PUBLIC_SITE_BRAND: SiteBrand = {
  key: "public",
  metadataTitle: "洄归生态客户管理与报价协同系统",
  metadataDescription: "面向网页端的 CRM、农业方案报价与协同系统",
  loadingTitle: "洄归生态客户管理与报价协同系统",
  loadingSubtitle: "正在进入系统...",
  sidebarEyebrow: "Huigui Ecology CRM",
  sidebarTitle: "洄归生态 CRM",
  sidebarSubtitle: "深绿品牌导航与专业工作台内容区统一协同。",
  loginCompanyName: "北京洄归生态科技有限责任公司",
  loginSloganLabel: "品牌主张",
  loginHeroTitleLines: [
    "让更多人",
    "共同参与世界生态",
    "的绿色修复和洄归",
  ],
  loginHeroLead:
    "把客户协同、农业方案与报价流程，放进一个更温柔也更坚定的绿色入口。",
  loginPanelBadge: "Huigui CRM",
  loginPanelTitle: "登录系统",
  loginPanelDescription: "进入北京洄归生态科技有限责任公司的协同空间。",
  loginButtonLabel: "进入洄归后台",
  loginFooter: "欢迎回到今天的绿色复原现场。",
  organizationListLabel: "核心业务",
  organizationList: ["客户协同", "农业方案", "报价流程", "团队协作"],
  visionLabel: "品牌方向",
  vision: "让更多人共同参与世界生态的绿色修复和洄归。",
};

export const MANAGEMENT_SITE_BRAND: SiteBrand = {
  key: "management",
  metadataTitle: "大愛歸心管理平台",
  metadataDescription:
    "大愛歸心旗下歸心之旅、光的家園、熊抱大地、道沖元氣與洄歸生態科技的管理協同平台",
  loadingTitle: "大愛歸心管理平台",
  loadingSubtitle: "正在进入管理协同入口...",
  sidebarEyebrow: "Da Ai Gui Xin",
  sidebarTitle: "大愛歸心管理平台",
  sidebarSubtitle: "多公司共用周報、班表與內部管理協同入口。",
  loginCompanyName: "大愛歸心管理平台",
  loginSloganLabel: "公司願景",
  loginHeroTitleLines: ["像光一樣", "照亮自己的生命", "服務全部的生命"],
  loginHeroLead:
    "旗下公司在这里同步周報、班表與管理協作，讓每週的進展、排班與內部節奏可以在同一束光裡對齊。",
  loginPanelBadge: "Da Ai Gui Xin",
  loginPanelTitle: "登录管理平台",
  loginPanelDescription: "进入大愛歸心旗下多公司共享的周報、班表與管理协同空间。",
  loginButtonLabel: "进入大愛歸心平台",
  loginFooter: "願今天的工作，也像光一樣展開。",
  organizationListLabel: "旗下公司",
  organizationList: [
    "歸心之旅",
    "光的家園",
    "熊抱大地",
    "道沖元氣",
    "洄歸生態科技",
  ],
  visionLabel: "公司願景",
  vision: "像光一樣照亮自己的生命，服務全部的生命。",
};

export function resolveSiteBrand(host?: string | null): SiteBrand {
  return isManagementEntryHost(host) ? MANAGEMENT_SITE_BRAND : PUBLIC_SITE_BRAND;
}
