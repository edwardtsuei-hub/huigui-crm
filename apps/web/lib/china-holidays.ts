export type ChinaCalendarInfo = {
  label: string;
  note: string;
  type: "holiday" | "adjusted_workday" | "festival" | "weekend";
  official?: boolean;
  sourceUrl?: string;
};

const STATE_COUNCIL_HOLIDAY_NOTICE_2026 =
  "https://zwfw.gansu.gov.cn/huixian/zczx/tzgg/art/2025/art_715c16a75e4d4c289c295e77772c7274.html";

const OFFICIAL_2026_CALENDAR: Record<string, ChinaCalendarInfo> = {
  "2026-01-01": {
    label: "元旦假期",
    note: "国务院办公厅 2026 年部分节假日安排：1 月 1 日至 3 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-01-02": {
    label: "元旦假期",
    note: "国务院办公厅 2026 年部分节假日安排：1 月 1 日至 3 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-01-03": {
    label: "元旦假期",
    note: "国务院办公厅 2026 年部分节假日安排：1 月 1 日至 3 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-01-04": {
    label: "元旦调休上班",
    note: "国务院办公厅 2026 年部分节假日安排：1 月 4 日（周日）上班。",
    type: "adjusted_workday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-02-14": {
    label: "春节调休上班",
    note: "国务院办公厅 2026 年部分节假日安排：2 月 14 日（周六）上班。",
    type: "adjusted_workday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-02-15": {
    label: "春节假期",
    note: "国务院办公厅 2026 年部分节假日安排：2 月 15 日至 23 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-02-16": {
    label: "春节假期",
    note: "国务院办公厅 2026 年部分节假日安排：2 月 15 日至 23 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-02-17": {
    label: "春节假期",
    note: "国务院办公厅 2026 年部分节假日安排：2 月 15 日至 23 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-02-18": {
    label: "春节假期",
    note: "国务院办公厅 2026 年部分节假日安排：2 月 15 日至 23 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-02-19": {
    label: "春节假期",
    note: "国务院办公厅 2026 年部分节假日安排：2 月 15 日至 23 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-02-20": {
    label: "春节假期",
    note: "国务院办公厅 2026 年部分节假日安排：2 月 15 日至 23 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-02-21": {
    label: "春节假期",
    note: "国务院办公厅 2026 年部分节假日安排：2 月 15 日至 23 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-02-22": {
    label: "春节假期",
    note: "国务院办公厅 2026 年部分节假日安排：2 月 15 日至 23 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-02-23": {
    label: "春节假期",
    note: "国务院办公厅 2026 年部分节假日安排：2 月 15 日至 23 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-02-28": {
    label: "春节调休上班",
    note: "国务院办公厅 2026 年部分节假日安排：2 月 28 日（周六）上班。",
    type: "adjusted_workday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-04-04": {
    label: "清明节假期",
    note: "国务院办公厅 2026 年部分节假日安排：4 月 4 日至 6 日放假。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-04-05": {
    label: "清明节假期",
    note: "国务院办公厅 2026 年部分节假日安排：4 月 4 日至 6 日放假。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-04-06": {
    label: "清明节假期",
    note: "国务院办公厅 2026 年部分节假日安排：4 月 4 日至 6 日放假。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-05-01": {
    label: "劳动节假期",
    note: "国务院办公厅 2026 年部分节假日安排：5 月 1 日至 5 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-05-02": {
    label: "劳动节假期",
    note: "国务院办公厅 2026 年部分节假日安排：5 月 1 日至 5 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-05-03": {
    label: "劳动节假期",
    note: "国务院办公厅 2026 年部分节假日安排：5 月 1 日至 5 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-05-04": {
    label: "劳动节假期",
    note: "国务院办公厅 2026 年部分节假日安排：5 月 1 日至 5 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-05-05": {
    label: "劳动节假期",
    note: "国务院办公厅 2026 年部分节假日安排：5 月 1 日至 5 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-05-09": {
    label: "劳动节调休上班",
    note: "国务院办公厅 2026 年部分节假日安排：5 月 9 日（周六）上班。",
    type: "adjusted_workday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-06-19": {
    label: "端午节假期",
    note: "国务院办公厅 2026 年部分节假日安排：6 月 19 日至 21 日放假。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-06-20": {
    label: "端午节假期",
    note: "国务院办公厅 2026 年部分节假日安排：6 月 19 日至 21 日放假。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-06-21": {
    label: "端午节假期",
    note: "国务院办公厅 2026 年部分节假日安排：6 月 19 日至 21 日放假。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-09-20": {
    label: "国庆调休上班",
    note: "国务院办公厅 2026 年部分节假日安排：9 月 20 日（周日）上班。",
    type: "adjusted_workday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-09-25": {
    label: "中秋节假期",
    note: "国务院办公厅 2026 年部分节假日安排：9 月 25 日至 27 日放假。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-09-26": {
    label: "中秋节假期",
    note: "国务院办公厅 2026 年部分节假日安排：9 月 25 日至 27 日放假。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-09-27": {
    label: "中秋节假期",
    note: "国务院办公厅 2026 年部分节假日安排：9 月 25 日至 27 日放假。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-10-01": {
    label: "国庆节假期",
    note: "国务院办公厅 2026 年部分节假日安排：10 月 1 日至 7 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-10-02": {
    label: "国庆节假期",
    note: "国务院办公厅 2026 年部分节假日安排：10 月 1 日至 7 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-10-03": {
    label: "国庆节假期",
    note: "国务院办公厅 2026 年部分节假日安排：10 月 1 日至 7 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-10-04": {
    label: "国庆节假期",
    note: "国务院办公厅 2026 年部分节假日安排：10 月 1 日至 7 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-10-05": {
    label: "国庆节假期",
    note: "国务院办公厅 2026 年部分节假日安排：10 月 1 日至 7 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-10-06": {
    label: "国庆节假期",
    note: "国务院办公厅 2026 年部分节假日安排：10 月 1 日至 7 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-10-07": {
    label: "国庆节假期",
    note: "国务院办公厅 2026 年部分节假日安排：10 月 1 日至 7 日放假调休。",
    type: "holiday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
  "2026-10-10": {
    label: "国庆调休上班",
    note: "国务院办公厅 2026 年部分节假日安排：10 月 10 日（周六）上班。",
    type: "adjusted_workday",
    official: true,
    sourceUrl: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
  },
};

const FIXED_FESTIVALS: Record<string, Omit<ChinaCalendarInfo, "sourceUrl" | "official">> = {
  "02-14": { label: "情人节", note: "节日前后适合关注礼品、活动与零售客户节奏。", type: "festival" },
  "03-08": { label: "妇女节", note: "品牌活动或福利类客户可能在节前集中确认执行。", type: "festival" },
  "05-04": { label: "青年节", note: "适合安排校园、培训或活动类客户回访。", type: "festival" },
  "06-01": { label: "儿童节", note: "亲子与教育客户常在节前一周冲刺排期。", type: "festival" },
  "09-10": { label: "教师节", note: "教育和机构客户在节日前后往往更适合跟进。", type: "festival" },
  "12-24": { label: "平安夜", note: "外贸、礼赠和活动客户会集中确认最后一波节点。", type: "festival" },
  "12-25": { label: "圣诞节", note: "节庆传播类客户适合复盘执行与库存安排。", type: "festival" },
};

export function getChinaCalendarInfo(dateKey: string): ChinaCalendarInfo | null {
  const year = Number(dateKey.slice(0, 4));
  if (year === 2026 && OFFICIAL_2026_CALENDAR[dateKey]) {
    return OFFICIAL_2026_CALENDAR[dateKey];
  }

  const monthDay = dateKey.slice(5);
  if (FIXED_FESTIVALS[monthDay]) {
    return FIXED_FESTIVALS[monthDay];
  }

  const date = new Date(`${dateKey}T12:00:00`);
  const weekday = date.getDay();
  if (weekday === 0 || weekday === 6) {
    return {
      label: weekday === 6 ? "周六" : "周日",
      note: "可用于补齐下周计划、整理报价或安排弹性客户沟通。",
      type: "weekend",
    };
  }

  return null;
}

export const chinaHolidaySources = {
  official2026: STATE_COUNCIL_HOLIDAY_NOTICE_2026,
};
