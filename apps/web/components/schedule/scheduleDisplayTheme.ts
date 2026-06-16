import type { CSSProperties } from "react";
import type {
  CalendarEvent,
  EventVisualTone,
  ScheduleDisplayThemeKey,
} from "./types";

type ScheduleThemeSpec = {
  accent: string;
  surface: string;
  border: string;
};

const scheduleThemeMap: Record<ScheduleDisplayThemeKey, ScheduleThemeSpec> = {
  "formal-1": {
    accent: "#2f7d4f",
    surface: "rgba(235, 244, 237, 0.98)",
    border: "rgba(54, 124, 78, 0.14)",
  },
  "formal-2": {
    accent: "#2f8b77",
    surface: "rgba(234, 247, 244, 0.98)",
    border: "rgba(58, 136, 118, 0.15)",
  },
  "formal-3": {
    accent: "#4b7a68",
    surface: "rgba(238, 245, 241, 0.98)",
    border: "rgba(79, 122, 105, 0.15)",
  },
  "travel-1": {
    accent: "#2f7d4f",
    surface: "rgba(236, 246, 239, 0.98)",
    border: "rgba(52, 122, 75, 0.15)",
  },
  "travel-2": {
    accent: "#2d8b7d",
    surface: "rgba(234, 248, 245, 0.98)",
    border: "rgba(49, 136, 122, 0.15)",
  },
  "travel-3": {
    accent: "#36759f",
    surface: "rgba(237, 245, 252, 0.98)",
    border: "rgba(62, 116, 159, 0.16)",
  },
  "meeting-1": {
    accent: "#2f74c0",
    surface: "rgba(236, 244, 255, 0.98)",
    border: "rgba(67, 118, 189, 0.16)",
  },
  "meeting-2": {
    accent: "#4967bf",
    surface: "rgba(239, 242, 255, 0.98)",
    border: "rgba(82, 102, 191, 0.16)",
  },
  "meeting-3": {
    accent: "#4f7b97",
    surface: "rgba(239, 245, 249, 0.98)",
    border: "rgba(81, 123, 151, 0.16)",
  },
  "followup-1": {
    accent: "#c78a2c",
    surface: "rgba(253, 246, 232, 0.98)",
    border: "rgba(199, 138, 44, 0.17)",
  },
  "followup-2": {
    accent: "#b67b3e",
    surface: "rgba(252, 244, 236, 0.98)",
    border: "rgba(182, 123, 62, 0.17)",
  },
  "followup-3": {
    accent: "#a08a3c",
    surface: "rgba(248, 246, 236, 0.98)",
    border: "rgba(160, 138, 60, 0.17)",
  },
  "plan-1": {
    accent: "#346f5d",
    surface: "rgba(237, 244, 241, 0.98)",
    border: "rgba(56, 111, 93, 0.15)",
  },
  "plan-2": {
    accent: "#4b7d72",
    surface: "rgba(239, 246, 243, 0.98)",
    border: "rgba(75, 125, 114, 0.15)",
  },
  "plan-3": {
    accent: "#5d766c",
    surface: "rgba(241, 245, 243, 0.98)",
    border: "rgba(93, 118, 108, 0.15)",
  },
  "quotation-1": {
    accent: "#5462cb",
    surface: "rgba(239, 241, 255, 0.98)",
    border: "rgba(94, 108, 205, 0.17)",
  },
  "quotation-2": {
    accent: "#7755c7",
    surface: "rgba(244, 240, 255, 0.98)",
    border: "rgba(119, 85, 199, 0.17)",
  },
  "quotation-3": {
    accent: "#6b6fb7",
    surface: "rgba(241, 242, 252, 0.98)",
    border: "rgba(107, 111, 183, 0.17)",
  },
  reminder: {
    accent: "#d18e2e",
    surface: "rgba(253, 246, 231, 0.98)",
    border: "rgba(209, 142, 46, 0.17)",
  },
  risk: {
    accent: "#c75c56",
    surface: "rgba(253, 239, 237, 0.98)",
    border: "rgba(199, 92, 86, 0.18)",
  },
  done: {
    accent: "#909b94",
    surface: "rgba(243, 245, 244, 0.98)",
    border: "rgba(145, 155, 148, 0.15)",
  },
  festival: {
    accent: "#bf7f3f",
    surface: "rgba(249, 243, 234, 0.98)",
    border: "rgba(191, 127, 63, 0.15)",
  },
};

function getFallbackThemeKey(
  event: CalendarEvent,
  tone: EventVisualTone,
): ScheduleDisplayThemeKey {
  if (tone === "done") {
    return "done";
  }

  if (tone === "risk") {
    return "risk";
  }

  if (
    tone === "reminder" ||
    event.marker === "notification" ||
    event.marker === "local"
  ) {
    return "reminder";
  }

  if (event.marker === "quotation") {
    return "quotation-1";
  }

  if (event.marker === "meeting") {
    return "meeting-1";
  }

  if (event.marker === "followup") {
    return "followup-1";
  }

  return "formal-1";
}

export function getEventDisplayThemeKey(
  event: CalendarEvent,
  tone: EventVisualTone,
): ScheduleDisplayThemeKey {
  return event.displayThemeKey ?? getFallbackThemeKey(event, tone);
}

export function getScheduleThemeStyle(
  themeKey: ScheduleDisplayThemeKey,
): CSSProperties {
  const theme = scheduleThemeMap[themeKey];
  return {
    "--schedule-theme-accent": theme.accent,
    "--schedule-theme-surface": theme.surface,
    "--schedule-theme-border": theme.border,
  } as CSSProperties;
}
