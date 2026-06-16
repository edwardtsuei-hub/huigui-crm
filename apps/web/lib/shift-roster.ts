"use client";

export const SHIFT_DEPARTMENTS = ["frontHouse", "kitchen", "daochong"] as const;
export const SHIFT_CODES = ["early", "late", "off", "leave", "full"] as const;
export const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"] as const;

export type ShiftRosterDepartmentKey = (typeof SHIFT_DEPARTMENTS)[number];
export type ShiftRosterShiftCode = (typeof SHIFT_CODES)[number];
export type ShiftRosterShiftValue = ShiftRosterShiftCode | "";

export type ShiftRosterUser = {
  id: string;
  username: string;
  password: string;
  name: string;
  role: string;
};

export type ShiftRosterStaffMember = {
  id: string;
  name: string;
  dept: ShiftRosterDepartmentKey;
  position: string;
  phone: string;
};

export type ShiftRosterDailyInfo = {
  activity: string;
  note: string;
  reservation: string;
};

export type ShiftRosterShiftTimes = {
  early: { s: string; e: string };
  late: { s: string; e: string };
  full: { s: string; e: string };
};

export type ShiftRosterConfig = {
  users: ShiftRosterUser[];
  staff: Record<ShiftRosterDepartmentKey, ShiftRosterStaffMember[]>;
  shiftTimes: Record<ShiftRosterDepartmentKey, ShiftRosterShiftTimes>;
  schedules: {
    weekly: Record<
      ShiftRosterDepartmentKey,
      Record<string, Record<string, ShiftRosterShiftCode>>
    >;
  };
  dailyInfo: Record<ShiftRosterDepartmentKey, Record<string, ShiftRosterDailyInfo>>;
};

export type ShiftRosterResponse = {
  config: ShiftRosterConfig;
  updatedAt: string | null;
  updatedBy: {
    id: string;
    name: string;
    roleName: string;
  } | null;
};

export const DEPARTMENT_META: Record<
  ShiftRosterDepartmentKey,
  {
    name: string;
    icon: string;
    accent: string;
    exportTitle: string;
  }
> = {
  frontHouse: {
    name: "前厅",
    icon: "🏠",
    accent: "#8b7355",
    exportTitle: "大爱归心前厅班表",
  },
  kitchen: {
    name: "后厨",
    icon: "👨‍🍳",
    accent: "#8b7355",
    exportTitle: "大爱归心后厨班表",
  },
  daochong: {
    name: "道冲元气",
    icon: "🌿",
    accent: "#6a8f73",
    exportTitle: "大爱归心道冲元气班表",
  },
};

export const POSITION_OPTIONS: Record<ShiftRosterDepartmentKey, string[]> = {
  frontHouse: ["店长", "店员"],
  kitchen: ["主厨", "厨师"],
  daochong: ["老师", "运营"],
};

export const SHIFT_CODE_META: Record<
  ShiftRosterShiftCode,
  {
    label: string;
    shortLabel: string;
  }
> = {
  early: { label: "早班", shortLabel: "早" },
  late: { label: "晚班", shortLabel: "晚" },
  off: { label: "休息", shortLabel: "休" },
  leave: { label: "请假", shortLabel: "假" },
  full: { label: "全天", shortLabel: "全" },
};

export const BLANK_DAILY_INFO: ShiftRosterDailyInfo = {
  activity: "",
  note: "",
  reservation: "",
};

const DEFAULT_SHIFT_ROSTER_CONFIG: ShiftRosterConfig = {
  users: [
    {
      id: "u1",
      username: "admin",
      password: "1234",
      name: "总管理员",
      role: "superadmin",
    },
    {
      id: "u2",
      username: "manager",
      password: "1234",
      name: "店长",
      role: "manager",
    },
    {
      id: "u3",
      username: "chef",
      password: "1234",
      name: "主厨",
      role: "chef",
    },
    {
      id: "u4",
      username: "daochong",
      password: "1234",
      name: "道冲元气管理员",
      role: "daochong_admin",
    },
  ],
  staff: {
    frontHouse: [],
    kitchen: [],
    daochong: [],
  },
  shiftTimes: {
    frontHouse: {
      early: { s: "10:00", e: "20:00" },
      late: { s: "11:00", e: "21:00" },
      full: { s: "10:00", e: "20:30" },
    },
    kitchen: {
      early: { s: "10:00", e: "20:30" },
      late: { s: "10:30", e: "21:00" },
      full: { s: "10:00", e: "20:30" },
    },
    daochong: {
      early: { s: "10:00", e: "20:00" },
      late: { s: "11:00", e: "21:00" },
      full: { s: "10:00", e: "20:30" },
    },
  },
  schedules: {
    weekly: {
      frontHouse: {},
      kitchen: {},
      daochong: {},
    },
  },
  dailyInfo: {
    frontHouse: {},
    kitchen: {},
    daochong: {},
  },
};

export function cloneShiftRosterConfig(config: ShiftRosterConfig) {
  return JSON.parse(JSON.stringify(config)) as ShiftRosterConfig;
}

export function createDefaultShiftRosterConfig() {
  return cloneShiftRosterConfig(DEFAULT_SHIFT_ROSTER_CONFIG);
}

export function getMonday(value: Date) {
  const date = new Date(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function formatDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? getMonday(new Date()) : parsed;
}

export function getWeekDates(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function formatShortDateLabel(value: Date) {
  return `${value.getMonth() + 1}/${value.getDate()}`;
}

export function formatWeekdayLabel(value: Date) {
  return WEEKDAY_LABELS[value.getDay()];
}

export function formatFullDateLabel(value: Date) {
  return `${value.getMonth() + 1}月${value.getDate()}日 周${formatWeekdayLabel(value)}`;
}

export function formatWeekRangeLabel(weekDates: Date[]) {
  const start = weekDates[0];
  const end = weekDates[weekDates.length - 1];
  return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
}

export function countDailyInfoLines(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return 0;
  }

  return normalized.split("\n").map((item) => item.trim()).filter(Boolean).length;
}

export function getDailyInfo(
  config: ShiftRosterConfig,
  department: ShiftRosterDepartmentKey,
  dateKey: string,
) {
  return config.dailyInfo[department][dateKey] ?? BLANK_DAILY_INFO;
}

export function getShiftValue(
  config: ShiftRosterConfig,
  department: ShiftRosterDepartmentKey,
  staffId: string,
  dateKey: string,
): ShiftRosterShiftValue {
  return config.schedules.weekly[department][staffId]?.[dateKey] ?? "";
}

export function sortStaffMembers(
  left: ShiftRosterStaffMember,
  right: ShiftRosterStaffMember,
) {
  return (
    left.position.localeCompare(right.position, "zh-Hans-CN") ||
    left.name.localeCompare(right.name, "zh-Hans-CN")
  );
}

export function setShiftCode(
  config: ShiftRosterConfig,
  department: ShiftRosterDepartmentKey,
  staffId: string,
  dateKey: string,
  shiftCode: ShiftRosterShiftValue,
) {
  const next = cloneShiftRosterConfig(config);
  if (!next.schedules.weekly[department][staffId]) {
    next.schedules.weekly[department][staffId] = {};
  }

  if (shiftCode) {
    next.schedules.weekly[department][staffId][dateKey] = shiftCode;
  } else {
    delete next.schedules.weekly[department][staffId][dateKey];
  }

  return next;
}

export function setDailyInfo(
  config: ShiftRosterConfig,
  department: ShiftRosterDepartmentKey,
  dateKey: string,
  value: ShiftRosterDailyInfo,
) {
  const next = cloneShiftRosterConfig(config);
  next.dailyInfo[department][dateKey] = {
    activity: value.activity,
    note: value.note,
    reservation: value.reservation,
  };
  return next;
}

export function buildWeekCopy(
  config: ShiftRosterConfig,
  department: ShiftRosterDepartmentKey,
  weekStart: Date,
) {
  const next = cloneShiftRosterConfig(config);
  const currentWeekDates = getWeekDates(weekStart);
  const nextWeekStart = addDays(weekStart, 7);
  const departmentSchedules = next.schedules.weekly[department];

  next.staff[department].forEach((member) => {
    if (!departmentSchedules[member.id]) {
      departmentSchedules[member.id] = {};
    }

    currentWeekDates.forEach((sourceDate, index) => {
      const sourceKey = formatDateKey(sourceDate);
      const targetKey = formatDateKey(addDays(nextWeekStart, index));
      const value = departmentSchedules[member.id][sourceKey];

      if (value) {
        departmentSchedules[member.id][targetKey] = value;
      } else {
        delete departmentSchedules[member.id][targetKey];
      }
    });
  });

  currentWeekDates.forEach((sourceDate, index) => {
    const sourceKey = formatDateKey(sourceDate);
    const targetKey = formatDateKey(addDays(nextWeekStart, index));
    const currentInfo = getDailyInfo(next, department, sourceKey);
    next.dailyInfo[department][targetKey] = {
      activity: currentInfo.activity,
      note: currentInfo.note,
      reservation: currentInfo.reservation,
    };
  });

  return next;
}

export function upsertStaffMember(
  config: ShiftRosterConfig,
  member: Omit<ShiftRosterStaffMember, "id"> & { id?: string },
) {
  const next = cloneShiftRosterConfig(config);
  const memberId = member.id ?? `staff-${Date.now()}`;

  SHIFT_DEPARTMENTS.forEach((department) => {
    next.staff[department] = next.staff[department].filter(
      (item) => item.id !== memberId,
    );
  });

  next.staff[member.dept].push({
    id: memberId,
    name: member.name,
    dept: member.dept,
    position: member.position,
    phone: member.phone,
  });

  next.staff[member.dept].sort(sortStaffMembers);
  return next;
}

export function removeStaffMember(
  config: ShiftRosterConfig,
  department: ShiftRosterDepartmentKey,
  staffId: string,
) {
  const next = cloneShiftRosterConfig(config);
  next.staff[department] = next.staff[department].filter(
    (member) => member.id !== staffId,
  );
  delete next.schedules.weekly[department][staffId];
  return next;
}

export function setShiftTime(
  config: ShiftRosterConfig,
  department: ShiftRosterDepartmentKey,
  shiftType: keyof ShiftRosterShiftTimes,
  field: "s" | "e",
  value: string,
) {
  const next = cloneShiftRosterConfig(config);
  next.shiftTimes[department][shiftType][field] = value;
  return next;
}
