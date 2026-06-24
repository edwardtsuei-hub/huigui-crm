export type DaochongRoleKey = "teacher" | "chengcheng" | "admin" | "finance" | "frontDesk";

export type DaochongPermissionKey =
  | "viewSchedule"
  | "manageAppointment"
  | "submitSettlement"
  | "uploadEvidence"
  | "viewEvidence"
  | "submitRecharge"
  | "approveRecharge"
  | "approveConsumption"
  | "viewFinanceSummary"
  | "manageProjects"
  | "manageCompensation"
  | "manageMembers"
  | "viewOwnPerformance"
  | "viewCustomers"
  | "writeServiceNote";

export type DaochongPageKey =
  | "home"
  | "performance"
  | "customers"
  | "customerDetail"
  | "profile"
  | "appointment"
  | "settlement"
  | "recharge"
  | "evidence"
  | "serviceNote"
  | "approval"
  | "settings"
  | "members"
  | "projects"
  | "compensation"
  | "finance"
  | "communication"
  | "expense"
  | "bonus"
  | "acceptance"
  | "apiPlan";

export type DaochongTone = "green" | "amber" | "rose" | "blue" | "neutral";

export type DaochongRole = {
  key: DaochongRoleKey;
  label: string;
  description: string;
  permissions: DaochongPermissionKey[];
};

export type DaochongNavItem = {
  key: DaochongPageKey;
  label: string;
  note: string;
  permission?: DaochongPermissionKey;
};

export type DaochongAction = {
  key: string;
  label: string;
  note: string;
  page: DaochongPageKey;
  permission?: DaochongPermissionKey;
};

export type DaochongPageMeta = {
  chip: string;
  title: string;
  subtitle: string;
};

export type DaochongStat = {
  label: string;
  value: string;
  note: string;
};

export type DaochongStatusItem = {
  title: string;
  note: string;
  status: string;
  tone: DaochongTone;
};

export type DaochongFormField = {
  label: string;
  value: string;
  helper?: string;
};

export type DaochongPermissionGroup = {
  title: string;
  note: string;
  items: string[];
};

export type DaochongTimelineItem = {
  title: string;
  note: string;
  meta: string;
  tone: DaochongTone;
};

export type DaochongAppointment = {
  id?: string;
  time: string;
  title: string;
  note: string;
  action: string;
  tone: DaochongTone;
  page: DaochongPageKey;
};

export type DaochongCustomer = {
  avatar: string;
  id?: string;
  name: string;
  note: string;
  status: string;
  tone: DaochongTone;
};

export type DaochongMoneyRow = {
  label: string;
  note: string;
  value: string;
};

export type DaochongDataSourceMode = "mock" | "api-readonly";

export type DaochongReadonlyEndpointKey =
  | "snapshot"
  | "appointments"
  | "appointmentDetail"
  | "customers"
  | "customerDetail"
  | "customerCardBalances"
  | "roster"
  | "projects"
  | "compensation"
  | "settlementDrafts"
  | "consumptionApprovals"
  | "recharges"
  | "rechargeCreate"
  | "evidenceAssets"
  | "serviceNotes"
  | "serviceNoteCreate"
  | "serviceNoteUpdate"
  | "customerPreferences"
  | "wecomReminderDryRuns"
  | "wecomReminderTestSend"
  | "financeSummary"
  | "financeEvidenceExceptions"
  | "bonusExpenseItems"
  | "projectCommunications"
  | "meetingNotes";

export type DaochongReadonlyEndpointSpec = {
  key: DaochongReadonlyEndpointKey;
  path: string;
  usedBy: DaochongPageKey[];
  fields: string[];
};

export type DaochongMobileSnapshot = {
  dataSourceDiagnostics: DaochongStatusItem[];
  pageMeta: Record<DaochongPageKey, DaochongPageMeta>;
  homeStats: DaochongStat[];
  homeStatuses: DaochongStatusItem[];
  todayRosterStatuses: DaochongStatusItem[];
  weekRosterStatuses: DaochongStatusItem[];
  activityStatuses: DaochongStatusItem[];
  appointments: DaochongAppointment[];
  appointmentDetailFields: DaochongFormField[];
  appointmentDetailStatuses: DaochongStatusItem[];
  performanceStats: DaochongStat[];
  performanceRows: DaochongMoneyRow[];
  customers: DaochongCustomer[];
  customerProfileFields: DaochongFormField[];
  customerServiceHistory: DaochongTimelineItem[];
  customerPreferenceRows: DaochongMoneyRow[];
  approvalStatuses: DaochongStatusItem[];
  approvalDetailFields: DaochongFormField[];
  approvalRows: DaochongMoneyRow[];
  approvalDecisionFields: DaochongFormField[];
  approvalTimeline: DaochongTimelineItem[];
  settlementFields: DaochongFormField[];
  settlementDraftFields: DaochongFormField[];
  settlementDraftRows: DaochongMoneyRow[];
  settlementSubmissionTimeline: DaochongTimelineItem[];
  settlementStatuses: DaochongStatusItem[];
  rechargeFields: DaochongFormField[];
  rechargeRows: DaochongMoneyRow[];
  rechargeStatuses: DaochongStatusItem[];
  evidenceFields: DaochongFormField[];
  evidenceRows: DaochongMoneyRow[];
  evidenceStatuses: DaochongStatusItem[];
  evidenceTimeline: DaochongTimelineItem[];
  serviceNoteContextFields: DaochongFormField[];
  serviceNoteFields: DaochongFormField[];
  serviceNotePendingRows: DaochongMoneyRow[];
  serviceNoteReminderFields: DaochongFormField[];
  serviceNoteReminderTimeline: DaochongTimelineItem[];
  serviceNoteDryRunStatuses: DaochongStatusItem[];
  serviceNoteStatuses: DaochongStatusItem[];
  financeRows: DaochongMoneyRow[];
  financeDraftFields: DaochongFormField[];
  financeExceptionRows: DaochongMoneyRow[];
  financeBonusExpenseRows: DaochongMoneyRow[];
  financeStatuses: DaochongStatusItem[];
  financeTimeline: DaochongTimelineItem[];
  expenseFields: DaochongFormField[];
  expenseRows: DaochongMoneyRow[];
  expenseStatuses: DaochongStatusItem[];
  teamBonusFields: DaochongFormField[];
  teamBonusRows: DaochongMoneyRow[];
  teamBonusStatuses: DaochongStatusItem[];
  communicationFields: DaochongFormField[];
  communicationRows: DaochongMoneyRow[];
  communicationStatuses: DaochongStatusItem[];
  communicationTimeline: DaochongTimelineItem[];
  meetingNoteFields: DaochongFormField[];
  meetingTodoRows: DaochongMoneyRow[];
  meetingNoteStatuses: DaochongStatusItem[];
  acceptanceFields: DaochongFormField[];
  acceptancePageRows: DaochongMoneyRow[];
  acceptanceRoleRows: DaochongMoneyRow[];
  acceptanceCreateRows: DaochongMoneyRow[];
  acceptanceReadonlyRows: DaochongMoneyRow[];
  acceptanceStatuses: DaochongStatusItem[];
  acceptanceTimeline: DaochongTimelineItem[];
  apiPlanFields: DaochongFormField[];
  apiPlanPhaseRows: DaochongMoneyRow[];
  apiPlanEndpointRows: DaochongMoneyRow[];
  apiPlanRiskRows: DaochongMoneyRow[];
  apiPlanPrecheckRows: DaochongMoneyRow[];
  apiPlanSourceRows: DaochongMoneyRow[];
  apiPlanBlockerRows: DaochongMoneyRow[];
  apiPlanStatuses: DaochongStatusItem[];
  apiPlanTimeline: DaochongTimelineItem[];
  managementStatuses: DaochongStatusItem[];
  memberRows: DaochongMoneyRow[];
  memberPermissionStatuses: DaochongStatusItem[];
  permissionGroups: DaochongPermissionGroup[];
  projectRows: DaochongMoneyRow[];
  projectStatuses: DaochongStatusItem[];
  projectFormFields: DaochongFormField[];
  compensationRows: DaochongMoneyRow[];
  compensationStatuses: DaochongStatusItem[];
  compensationFormFields: DaochongFormField[];
};

export type DaochongMobileDataSource = {
  mode: DaochongDataSourceMode;
  readonlyEndpoints: DaochongReadonlyEndpointSpec[];
  getSnapshot: () => DaochongMobileSnapshot;
};
