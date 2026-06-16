#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..", "..");
const helperPath = path.resolve(__dirname, "read_excel_sheet_rows.py");
const defaultWorkbookPath = "/Users/i-datsuei/Downloads/工作表格统整/检测记录表.xlsx";

function parseArgs(argv) {
  const args = {
    workbook: defaultWorkbookPath,
    creatorLogin: "admin",
    apply: false,
    previewOut: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--apply") {
      args.apply = true;
      continue;
    }
    if (value === "--workbook" && argv[index + 1]) {
      args.workbook = argv[index + 1];
      index += 1;
      continue;
    }
    if (value === "--creator-login" && argv[index + 1]) {
      args.creatorLogin = argv[index + 1];
      index += 1;
      continue;
    }
    if (value === "--preview-out" && argv[index + 1]) {
      args.previewOut = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

function readWorkbookRows(workbookPath) {
  const result = spawnSync("python3", [helperPath, workbookPath], {
    cwd: rootDir,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "Excel 解析失败");
  }

  return JSON.parse(result.stdout);
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).replace(/\u00a0/g, " ").trim();
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function normalizeKey(value) {
  return compactText(value).toLowerCase();
}

function splitLines(value) {
  return normalizeText(value)
    .split(/\r?\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueLines(lines) {
  return [...new Set(lines.map((item) => item.trim()).filter(Boolean))];
}

function joinParagraphs(lines) {
  return uniqueLines(lines).join("\n");
}

function joinSentenceParts(parts) {
  return uniqueLines(parts).join("；");
}

function looksLikeSameAsAbove(value) {
  return /^(同上|同土壤)$/u.test(normalizeText(value));
}

function looksLikeSampleNote(value) {
  return /^备注[:：]/u.test(normalizeText(value));
}

function sanitizeInlineFormulaText(value) {
  const text = normalizeText(value);
  if (!text) {
    return "";
  }
  if (/^=DISPIMG\(/i.test(text)) {
    return "";
  }
  return text;
}

function parseDateCandidates(value, fallbackYear) {
  const text = normalizeText(value);
  if (!text) {
    return [];
  }

  if (/^\d+(?:\.\d+)?$/u.test(text)) {
    return [];
  }

  const results = [];
  const seen = new Set();
  const isoPattern = /(\d{4})-(\d{1,2})-(\d{1,2})(?:T\d{2}:\d{2}:\d{2})?/g;
  const yearAwarePattern =
    /(\d{4})\s*[./\-年]\s*(\d{1,2})\s*(?:月)?\s*(?:[./\-])?\s*(\d{1,2})(?:日)?/g;
  const yearlessPattern =
    /(^|[^\d])(\d{1,2})\s*(?:月|[./\-])\s*(?:[./\-])?\s*(\d{1,2})(?:日)?/g;

  for (const match of text.matchAll(isoPattern)) {
    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      9,
      0,
      0,
    );
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    const iso = date.toISOString();
    if (!seen.has(iso)) {
      seen.add(iso);
      results.push(iso);
    }
  }

  for (const match of text.matchAll(yearAwarePattern)) {
    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      9,
      0,
      0,
    );
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    const iso = date.toISOString();
    if (!seen.has(iso)) {
      seen.add(iso);
      results.push(iso);
    }
  }

  for (const match of text.matchAll(yearlessPattern)) {
    const year = fallbackYear || new Date().getFullYear();
    const date = new Date(year, Number(match[2]) - 1, Number(match[3]), 9, 0, 0);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    const iso = date.toISOString();
    if (!seen.has(iso)) {
      seen.add(iso);
      results.push(iso);
    }
  }

  return results;
}

function parseFirstDate(value, fallbackYear) {
  return parseDateCandidates(value, fallbackYear)[0] ?? "";
}

function extractPhone(value) {
  return normalizeText(value).match(/1\d{10}/)?.[0] ?? "";
}

function parseAmount(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return {
      amount: value,
      amountText: "",
    };
  }

  const text = normalizeText(value);
  if (!text) {
    return {
      amount: null,
      amountText: "",
    };
  }

  const equationMatch = text.match(/=\s*([0-9]+(?:\.[0-9]+)?)/);
  if (equationMatch) {
    return {
      amount: Number(equationMatch[1]),
      amountText: text,
    };
  }

  const yuanMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*元/);
  if (yuanMatch) {
    return {
      amount: Number(yuanMatch[1]),
      amountText: text,
    };
  }

  const numericMatch = text.match(/^[0-9]+(?:\.[0-9]+)?$/);
  if (numericMatch) {
    return {
      amount: Number(text),
      amountText: "",
    };
  }

  const isolatedNumbers = [...text.matchAll(/([0-9]+(?:\.[0-9]+)?)/g)].map(
    (match) => Number(match[1]),
  );
  if (isolatedNumbers.length === 1) {
    return {
      amount: isolatedNumbers[0],
      amountText: text,
    };
  }

  return {
    amount: null,
    amountText: text,
  };
}

function looksLikeReportIssued(value) {
  const text = normalizeText(value);
  if (!text) {
    return false;
  }
  if (/报告已出|已出.*报告|出报告|检测报告/u.test(text)) {
    return true;
  }
  return /报告/u.test(text) && !/发票|汇报|报告人/u.test(text);
}

function cleanLabName(value) {
  return splitLines(value)[0] ?? normalizeText(value);
}

function extractProjectType(value) {
  const lines = splitLines(value);
  for (const line of lines) {
    const match = line.match(/[（(]([^()（）]{2,40})[)）]/u);
    if (match) {
      return match[1].trim();
    }
  }
  return "";
}

function deriveSampleType(value) {
  const text = normalizeText(value);
  if (!text) {
    return "";
  }
  if (/土壤/u.test(text)) {
    return "土壤";
  }
  if (/蔬菜|菠菜|茼蒿|香菜|快菜|上海青/u.test(text)) {
    return "蔬菜";
  }
  if (/果样|柑橘|果/u.test(text)) {
    return "果样";
  }
  if (/粪便|有机肥/u.test(text)) {
    return "粪便";
  }
  if (/水|养殖/u.test(text)) {
    return "水样";
  }
  if (/乳/u.test(text)) {
    return "乳样";
  }
  if (/光伏板/u.test(text)) {
    return "光伏板";
  }
  return "";
}

function deriveItemCategory(value) {
  const text = normalizeText(value);
  if (!text) {
    return "";
  }
  if (/农残/u.test(text)) {
    return "农残";
  }
  if (/重金属|总砷|总汞|总铅|总镉|总铬/u.test(text)) {
    return "重金属";
  }
  if (/微生物|菌|脲酶|蔗糖酶|沙门氏菌/u.test(text)) {
    return "微生物";
  }
  if (/透光率|反射率|功率|去污|清洗|清洁/u.test(text)) {
    return "性能测试";
  }
  if (/ICP|元素|PH|pH|电导率|有机质|氮|磷|钾|容重|酸|糖|维c|类胡萝卜素|叶绿素|固含量/u.test(text)) {
    return "理化";
  }
  return "常规";
}

function deriveTimelineEventType(value) {
  const text = normalizeText(value);
  if (!text) {
    return "NOTE";
  }
  if (looksLikeReportIssued(text)) {
    return "REPORT_ISSUED";
  }
  if (/检测中|安排检测|测试中|试验|保存/u.test(text)) {
    return "IN_PROGRESS";
  }
  if (/收到样本|收样/u.test(text)) {
    return "RECEIVED";
  }
  if (/送检|送到实验室/u.test(text)) {
    return "SUBMITTED";
  }
  if (/付款|发票/u.test(text)) {
    return "PAYMENT";
  }
  return "NOTE";
}

function deriveItemStatus(progressText) {
  const text = normalizeText(progressText);
  if (!text) {
    return "PENDING";
  }
  if (looksLikeReportIssued(text)) {
    return "REPORTED";
  }
  if (/取消/u.test(text)) {
    return "CANCELED";
  }
  if (/检测中|安排检测|测试中|试验|收到样本|收样|送检/u.test(text)) {
    return "IN_PROGRESS";
  }
  return "PENDING";
}

function createUnspecifiedSample() {
  return {
    sampleName: "未明确样本",
    sampleType: "",
    sampleTarget: "",
    sampleQuantityText: "",
    sampledAt: "",
    submittedAt: "",
    plannedTestScope: "",
    note: "",
    items: [],
  };
}

function buildOrderGroups(rows) {
  const groups = [];
  let current = null;

  for (const row of rows) {
    const inspectionTarget = normalizeText(row.values["检测对象"]);
    if (inspectionTarget) {
      current = {
        sourceSheet: "总表",
        startRow: row.rowNumber,
        rows: [],
      };
      groups.push(current);
    }

    if (!current) {
      continue;
    }

    current.rows.push(row);
  }

  return groups;
}

function findFirstNonEmpty(rows, key) {
  for (const row of rows) {
    const value = normalizeText(row.values[key]);
    if (value) {
      return value;
    }
  }
  return "";
}

function buildTimelineContent(sampleName, itemName, line) {
  return joinSentenceParts([
    sampleName && sampleName !== "未明确样本" ? `样本：${sampleName}` : "",
    itemName ? `项目：${itemName}` : "",
    normalizeText(line),
  ]);
}

function addTimeline(timelineMap, { eventType, eventAt, content }) {
  const normalizedContent = normalizeText(content);
  if (!normalizedContent) {
    return;
  }
  const key = `${eventType}|${eventAt || ""}|${normalizeKey(normalizedContent)}`;
  if (timelineMap.has(key)) {
    return;
  }
  timelineMap.set(key, {
    eventType,
    eventAt,
    content: normalizedContent,
  });
}

function parsePaymentEntries(rawDate, rawAmount, fallbackYear) {
  rawDate = normalizeText(rawDate);
  rawAmount = normalizeText(rawAmount);
  if (!rawDate && !rawAmount) {
    return [];
  }

  const note = joinParagraphs([
    rawDate ? `原始付款信息：${rawDate}` : "",
    rawAmount ? `原始金额信息：${rawAmount}` : "",
  ]);
  const dateEntries = splitLines(rawDate).flatMap((line) => {
    if (/发票/u.test(line) && !/付款|转账|已付/u.test(line)) {
      return [];
    }
    return parseDateCandidates(line, fallbackYear).map((paidAt) => ({
      paidAt,
      source: line,
    }));
  });
  const amountEntries = splitLines(rawAmount)
    .map((line) => {
      const parsed = parseAmount(line);
      if (parsed.amount === null && !parsed.amountText) {
        return null;
      }
      return {
        amount: parsed.amount,
        amountText: parsed.amountText,
        source: line,
      };
    })
    .filter(Boolean);

  const entries = [];
  const pairCount = Math.max(dateEntries.length, amountEntries.length, 1);
  for (let index = 0; index < pairCount; index += 1) {
    const dateEntry =
      dateEntries[index] ??
      (dateEntries.length === 1 ? dateEntries[0] : null);
    const amountEntry =
      amountEntries[index] ??
      (amountEntries.length === 1 ? amountEntries[0] : null);

    entries.push({
      paidAt: dateEntry?.paidAt ?? "",
      amount: amountEntry?.amount ?? null,
      amountText: amountEntry?.amountText ?? "",
      method: "对公转账",
      payerName: "",
      note,
    });
  }

  if (entries.length) {
    return entries;
  }

  const fallbackAmount = parseAmount(rawAmount || rawDate);
  return [
    {
      paidAt: "",
      amount: fallbackAmount.amount,
      amountText: fallbackAmount.amountText || joinParagraphs([rawDate, rawAmount]),
      method: "对公转账",
      payerName: "",
      note,
    },
  ];
}

function normalizeInspectionGroup(group, labDefaults) {
  const rows = group.rows;
  const firstRow = rows[0]?.values ?? {};
  const inspectionTarget = normalizeText(firstRow["检测对象"]);
  const rawLabName = findFirstNonEmpty(rows, "送检机构");
  const labName = cleanLabName(rawLabName);
  const labKey = normalizeKey(labName);
  const inheritedLab = labDefaults.get(labKey) ?? {};
  const labCity = findFirstNonEmpty(rows, "送检地") || inheritedLab.labCity || "";
  const rawLabAddress = findFirstNonEmpty(rows, "送检地址");
  const labAddress = looksLikeSameAsAbove(rawLabAddress)
    ? inheritedLab.labAddress || ""
    : rawLabAddress || inheritedLab.labAddress || "";
  const rawBankInfo = findFirstNonEmpty(rows, "对公转账信息");
  const bankInfo = looksLikeSameAsAbove(rawBankInfo)
    ? inheritedLab.bankInfo || ""
    : rawBankInfo || inheritedLab.bankInfo || "";
  const contactName = findFirstNonEmpty(rows, "对接人") || extractPhone(labAddress) || "";
  const contactPhone = extractPhone(labAddress);
  const submittedAt = parseFirstDate(
    findFirstNonEmpty(rows, "送检日期"),
    new Date().getFullYear(),
  );
  const firstSampledAt = parseFirstDate(
    findFirstNonEmpty(rows, "取样日期"),
    new Date().getFullYear(),
  );
  const referenceYear = submittedAt
    ? new Date(submittedAt).getFullYear()
    : firstSampledAt
      ? new Date(firstSampledAt).getFullYear()
      : new Date().getFullYear();
  const expectedCycleText = findFirstNonEmpty(rows, "检测周期");
  const projectType =
    extractProjectType(rawLabName) || deriveSampleType(inspectionTarget) || "";

  const sampleMap = new Map();
  const timelineMap = new Map();
  const payments = [];
  const orderNotes = [];
  let currentSampleKey = "";

  const paymentSkipRows = new Set();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const values = row.values;
    const sampleLabel = normalizeText(values["样本对象"]);
    const sampleScope = sanitizeInlineFormulaText(values["样本检测项目"]);
    const quantityText = normalizeText(values["取样量"]);
    const sampledAt = parseFirstDate(values["取样日期"], referenceYear);
    const sampleSubmittedAt = parseFirstDate(values["送检日期"], referenceYear);
    const progressText = normalizeText(values["检测进程"]);
    const itemName = normalizeText(values["检测项目"]);
    const fee = parseAmount(values["检测费用"]);

    if (looksLikeSampleNote(sampleLabel)) {
      orderNotes.push(sampleLabel);
      currentSampleKey = "__unspecified__";
    } else if (sampleLabel) {
      currentSampleKey = normalizeKey(sampleLabel);
    } else if (!currentSampleKey) {
      currentSampleKey = "__unspecified__";
    }

    if (!sampleMap.has(currentSampleKey)) {
      sampleMap.set(
        currentSampleKey,
        currentSampleKey === "__unspecified__"
          ? createUnspecifiedSample()
          : {
              sampleName: sampleLabel,
              sampleType: deriveSampleType(sampleLabel),
              sampleTarget: sampleScope,
              sampleQuantityText: quantityText,
              sampledAt,
              submittedAt: sampleSubmittedAt,
              plannedTestScope: sampleScope,
              note: "",
              items: [],
            },
      );
    }

    const sample = sampleMap.get(currentSampleKey);
    if (
      sampleLabel &&
      !looksLikeSampleNote(sampleLabel) &&
      sample.sampleName === "未明确样本"
    ) {
      sample.sampleName = sampleLabel;
      sample.sampleType = deriveSampleType(sampleLabel);
    }
    if (!sample.sampleTarget && sampleScope) {
      sample.sampleTarget = sampleScope;
    }
    if (!sample.plannedTestScope && sampleScope) {
      sample.plannedTestScope = sampleScope;
    }
    if (!sample.sampleQuantityText && quantityText) {
      sample.sampleQuantityText = quantityText;
    }
    if (!sample.sampledAt && sampledAt) {
      sample.sampledAt = sampledAt;
    }
    if (!sample.submittedAt && sampleSubmittedAt) {
      sample.submittedAt = sampleSubmittedAt;
    }

    if (itemName) {
      const isReported = looksLikeReportIssued(progressText);
      sample.items.push({
        itemName,
        itemCategory: deriveItemCategory(itemName),
        feeText: fee.amountText,
        feeAmount: fee.amount,
        status: deriveItemStatus(progressText),
        resultSummary: isReported ? progressText : "",
        progressNote: isReported ? "" : progressText,
        completedAt: isReported ? parseFirstDate(progressText, referenceYear) : "",
      });
    }

    if (progressText) {
      for (const line of splitLines(progressText)) {
        addTimeline(timelineMap, {
          eventType: deriveTimelineEventType(line),
          eventAt: parseFirstDate(line, referenceYear),
          content: buildTimelineContent(sample.sampleName, itemName, line),
        });
      }
    }

    if (!paymentSkipRows.has(rowIndex)) {
      const rawPaymentDate = normalizeText(values["付款日期"]);
      const rawPaymentAmount = normalizeText(values["付款金额"]);

      if (rawPaymentDate || rawPaymentAmount) {
        let paymentDateText = rawPaymentDate;
        let paymentAmountText = rawPaymentAmount;

        if (rawPaymentDate && !rawPaymentAmount) {
          const nextValues = rows[rowIndex + 1]?.values;
          const nextPaymentDate = normalizeText(nextValues?.["付款日期"]);
          const nextPaymentAmount = normalizeText(nextValues?.["付款金额"]);
          if (!nextPaymentDate && nextPaymentAmount) {
            paymentAmountText = nextPaymentAmount;
            paymentSkipRows.add(rowIndex + 1);
          }
        } else if (rawPaymentAmount && !rawPaymentDate) {
          const prevValues = rows[rowIndex - 1]?.values;
          const prevPaymentDate = normalizeText(prevValues?.["付款日期"]);
          const prevPaymentAmount = normalizeText(prevValues?.["付款金额"]);
          if (prevPaymentDate && !prevPaymentAmount) {
            paymentDateText = "";
            paymentAmountText = "";
          }
        }

        for (const payment of parsePaymentEntries(
          paymentDateText,
          paymentAmountText,
          referenceYear,
        )) {
          payments.push(payment);
        }
      }
    }
  }

  const samples = [...sampleMap.values()]
    .map((sample) => ({
      ...sample,
      note: joinParagraphs([sample.note, sample.sampleName === "未明确样本" ? joinParagraphs(orderNotes) : ""]),
    }))
    .filter((sample) => {
      const hasFields = Boolean(
        sample.sampleName && sample.sampleName !== "未明确样本",
      ) ||
        Boolean(sample.sampleTarget) ||
        Boolean(sample.sampleQuantityText) ||
        Boolean(sample.sampledAt) ||
        Boolean(sample.submittedAt) ||
        Boolean(sample.plannedTestScope) ||
        Boolean(sample.note);
      return hasFields || sample.items.length > 0;
    });

  const dedupedPayments = [];
  const paymentKeys = new Set();
  for (const payment of payments) {
    const key = `${payment.paidAt}|${payment.amount ?? ""}|${normalizeKey(payment.amountText)}|${normalizeKey(payment.note)}`;
    if (paymentKeys.has(key)) {
      continue;
    }
    paymentKeys.add(key);
    dedupedPayments.push(payment);
  }

  const importedAt = submittedAt || samples.find((sample) => sample.submittedAt)?.submittedAt || "";
  addTimeline(timelineMap, {
    eventType: "IMPORTED",
    eventAt: importedAt,
    content: `从检测记录表导入（总表#${group.startRow}-${rows[rows.length - 1].rowNumber}）`,
  });

  const timelines = [...timelineMap.values()].sort((left, right) => {
    const leftTime = left.eventAt ? new Date(left.eventAt).getTime() : 0;
    const rightTime = right.eventAt ? new Date(right.eventAt).getTime() : 0;
    return leftTime - rightTime;
  });

  const items = samples.flatMap((sample) => sample.items);
  const reportedCount = items.filter((item) => item.status === "REPORTED").length;
  const inProgressCount = items.filter((item) => item.status === "IN_PROGRESS").length;
  const totalPaidAmount = dedupedPayments.reduce(
    (sum, payment) => sum + (payment.amount || 0),
    0,
  );
  const totalFeeAmount = items.reduce(
    (sum, item) => sum + (item.feeAmount || 0),
    0,
  );

  let status = "DRAFT";
  if (reportedCount && reportedCount === items.length && items.length > 0) {
    status = "COMPLETED";
  } else if (reportedCount) {
    status = "PARTIAL_REPORTED";
  } else if (inProgressCount) {
    status = "IN_PROGRESS";
  } else if (timelines.some((item) => item.eventType === "RECEIVED")) {
    status = "RECEIVED";
  } else if (submittedAt) {
    status = "SUBMITTED";
  } else if (samples.some((sample) => sample.sampledAt)) {
    status = "SAMPLED";
  }

  let paymentStatus = "UNPAID";
  if (dedupedPayments.length) {
    if (totalPaidAmount > 0 && totalFeeAmount > 0 && totalPaidAmount < totalFeeAmount) {
      paymentStatus = "PARTIAL";
    } else {
      paymentStatus = "PAID";
    }
  }

  const remark = joinParagraphs([
    joinSentenceParts([
      `来源：总表#${group.startRow}-${rows[rows.length - 1].rowNumber}`,
      `样本数：${samples.length}`,
      `项目数：${items.length}`,
    ]),
    joinParagraphs(orderNotes),
  ]);

  const title = `${inspectionTarget} · ${labName}`.slice(0, 250);

  labDefaults.set(labKey, {
    labCity,
    labAddress,
    bankInfo,
  });

  return {
    sourceSheet: "总表",
    sourceRowStart: group.startRow,
    sourceRowEnd: rows[rows.length - 1].rowNumber,
    inspectionTarget,
    title,
    labName,
    labCity,
    labAddress,
    contactName,
    contactPhone,
    expectedCycleText,
    bankInfo,
    projectType,
    submittedAt,
    receivedAt:
      timelines.find((item) => item.eventType === "RECEIVED")?.eventAt ?? "",
    status,
    paymentStatus,
    summary: joinSentenceParts([
      samples.length ? `样本 ${samples.length} 个` : "",
      items.length ? `项目 ${items.length} 项` : "",
      dedupedPayments.length ? `付款记录 ${dedupedPayments.length} 条` : "",
    ]),
    remark,
    samples,
    payments: dedupedPayments,
    timelines,
    totalFeeAmount,
    totalPaidAmount,
  };
}

function normalizeEntityText(value) {
  return normalizeText(value)
    .replace(/[（(][^()（）]{0,20}[)）]/gu, "")
    .replace(/西红柿|蕃茄/gu, "番茄")
    .replace(/GA/giu, " ga ")
    .replace(/GB/giu, " gb ")
    .replace(/检测|使用前|使用后|试验前|试验后|产品|土壤|蔬菜|果样|粪便|养殖水|清洁测试|生态种植|生态农场|农场|村|样品|原水|试验地块/gu, "")
    .replace(/[、，,;；/]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractEntityHints(candidate) {
  const hints = new Set();
  for (const source of [
    candidate.inspectionTarget,
    ...candidate.samples.map((sample) => sample.sampleName),
  ]) {
    const raw = normalizeText(source);
    if (!raw) {
      continue;
    }
    for (const part of [raw, ...raw.split(/[、，,;；/\n]/u)]) {
      const hint = normalizeEntityText(part);
      if (hint.length >= 2) {
        hints.add(hint);
      }
    }
  }
  return [...hints];
}

function collectEntityAliases(record, fields) {
  const aliases = new Set();
  for (const field of fields) {
    const raw = normalizeText(record[field]);
    if (!raw) {
      continue;
    }
    for (const part of [raw, ...raw.split(/[、，,;；/\n]/u)]) {
      const alias = normalizeEntityText(part);
      if (alias.length >= 2) {
        aliases.add(alias);
      }
    }
  }
  return [...aliases];
}

function scoreEntityAlias(alias, hints) {
  const compactAlias = alias.replace(/\s+/g, "");
  let bestScore = 0;

  for (const hint of hints) {
    const compactHint = hint.replace(/\s+/g, "");
    if (!compactHint) {
      continue;
    }
    if (compactHint === compactAlias) {
      return 100;
    }
    if (
      compactHint.length >= 3 &&
      (compactHint.includes(compactAlias) || compactAlias.includes(compactHint))
    ) {
      bestScore = Math.max(
        bestScore,
        70 + Math.min(compactHint.length, compactAlias.length),
      );
      continue;
    }
    if (compactHint.length >= 2 && compactAlias.includes(compactHint)) {
      bestScore = Math.max(bestScore, 40 + compactHint.length);
    }
  }

  return bestScore;
}

function findBestEntityMatch(records, candidate, fields) {
  const hints = extractEntityHints(candidate);
  if (!hints.length) {
    return null;
  }

  let bestMatch = null;
  let secondBest = null;

  for (const record of records) {
    const aliases = collectEntityAliases(record, fields);
    const score = aliases.reduce(
      (best, alias) => Math.max(best, scoreEntityAlias(alias, hints)),
      0,
    );

    if (score < 42) {
      continue;
    }

    const scoredRecord = { record, score };
    if (!bestMatch || score > bestMatch.score) {
      secondBest = bestMatch;
      bestMatch = scoredRecord;
      continue;
    }

    if (!secondBest || score > secondBest.score) {
      secondBest = scoredRecord;
    }
  }

  if (!bestMatch) {
    return null;
  }

  if (secondBest && secondBest.score >= bestMatch.score) {
    return null;
  }

  if (
    bestMatch.score < 100 &&
    secondBest &&
    bestMatch.score - secondBest.score < 15
  ) {
    return null;
  }

  return bestMatch.record;
}

function findMatchingCustomer(customers, candidate) {
  return findBestEntityMatch(customers, candidate, [
    "customerName",
    "companyName",
  ]);
}

function findMatchingProduct(products, candidate) {
  return findBestEntityMatch(products, candidate, ["name", "displayName"]);
}

function findExistingInspection(existingOrders, candidate) {
  const submittedDate = candidate.submittedAt?.slice(0, 10) ?? "";
  return (
    existingOrders.find((order) => {
      if (normalizeKey(order.inspectionTarget) !== normalizeKey(candidate.inspectionTarget)) {
        return false;
      }
      if (normalizeKey(order.labName) !== normalizeKey(candidate.labName)) {
        return false;
      }

      const orderSubmittedDate = order.submittedAt?.toISOString().slice(0, 10) ?? "";
      return orderSubmittedDate === submittedDate;
    }) ?? null
  );
}

function buildSampleCreateInput(samples) {
  return samples.map((sample, sampleIndex) => ({
    sampleName: sample.sampleName,
    sampleType: sample.sampleType || null,
    sampleTarget: sample.sampleTarget || null,
    sampleQuantityText: sample.sampleQuantityText || null,
    sampledAt: sample.sampledAt ? new Date(sample.sampledAt) : null,
    submittedAt: sample.submittedAt ? new Date(sample.submittedAt) : null,
    plannedTestScope: sample.plannedTestScope || null,
    note: sample.note || null,
    sortOrder: sampleIndex,
    items: sample.items.length
      ? {
          create: sample.items.map((item, itemIndex) => ({
            itemName: item.itemName,
            itemCategory: item.itemCategory || null,
            feeText: item.feeText || null,
            feeAmount: item.feeAmount ?? null,
            status: item.status,
            resultSummary: item.resultSummary || null,
            progressNote: item.progressNote || null,
            completedAt: item.completedAt ? new Date(item.completedAt) : null,
            sortOrder: itemIndex,
          })),
        }
      : undefined,
  }));
}

function buildPaymentCreateInput(payments, creatorUserId) {
  return payments.map((payment) => ({
    paidAt: payment.paidAt ? new Date(payment.paidAt) : null,
    amount: payment.amount ?? null,
    amountText: payment.amountText || null,
    method: payment.method || null,
    payerName: payment.payerName || null,
    note: payment.note || null,
    createdByUserId: creatorUserId,
  }));
}

function buildTimelineCreateManyInput(timelines, orderId, creatorUserId) {
  return timelines.map((timeline) => ({
    orderId,
    eventType: timeline.eventType,
    eventAt: timeline.eventAt ? new Date(timeline.eventAt) : null,
    content: timeline.content,
    createdByUserId: creatorUserId,
  }));
}

function buildPreviewPayload(candidates) {
  const summary = {
    totalOrders: candidates.length,
    totalSamples: candidates.reduce(
      (sum, candidate) => sum + candidate.samples.length,
      0,
    ),
    totalItems: candidates.reduce(
      (sum, candidate) =>
        sum + candidate.samples.reduce((itemSum, sample) => itemSum + sample.items.length, 0),
      0,
    ),
    totalPayments: candidates.reduce(
      (sum, candidate) => sum + candidate.payments.length,
      0,
    ),
    statusBreakdown: Object.fromEntries(
      Object.entries(
        candidates.reduce((accumulator, candidate) => {
          accumulator[candidate.status] = (accumulator[candidate.status] ?? 0) + 1;
          return accumulator;
        }, {}),
      ).sort((left, right) => left[0].localeCompare(right[0], "zh-CN")),
    ),
  };

  return {
    generatedAt: new Date().toISOString(),
    summary,
    orders: candidates,
  };
}

function writePreview(previewOut, payload) {
  if (!previewOut) {
    return;
  }
  const targetPath = path.isAbsolute(previewOut)
    ? previewOut
    : path.resolve(rootDir, previewOut);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function applyImport({ candidates, creatorLogin }) {
  const prisma = new PrismaClient();
  try {
    const creator =
      (await prisma.user.findFirst({
        where: {
          status: "ACTIVE",
          OR: [{ loginAccount: creatorLogin }, { name: creatorLogin }],
        },
        select: { id: true, name: true, loginAccount: true },
      })) ??
      (await prisma.user.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, loginAccount: true },
      }));

    if (!creator) {
      throw new Error("没有可用的创建人账号，无法执行导入");
    }

    const [customers, products, existingOrders] = await Promise.all([
      prisma.customer.findMany({
        select: {
          id: true,
          customerName: true,
          companyName: true,
        },
      }),
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          displayName: true,
        },
      }),
      prisma.inspectionOrder.findMany({
        select: {
          id: true,
          inspectionTarget: true,
          labName: true,
          submittedAt: true,
          inspectionNo: true,
          customerId: true,
          productId: true,
        },
      }),
    ]);

    const now = new Date();
    const prefix = `JC${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    let sequence = await prisma.inspectionOrder.count({
      where: {
        inspectionNo: {
          startsWith: prefix,
        },
      },
    });

    const nextInspectionNo = () => {
      sequence += 1;
      return `${prefix}-${String(sequence).padStart(3, "0")}`;
    };

    const summary = {
      creator: creator.loginAccount || creator.name,
      createdOrders: 0,
      updatedOrders: 0,
      linkedCustomers: 0,
      linkedProducts: 0,
      orderIds: [],
    };

    for (const candidate of candidates) {
      const matchedCustomer = findMatchingCustomer(customers, candidate);
      const matchedProduct = findMatchingProduct(products, candidate);
      const existing = findExistingInspection(existingOrders, candidate);

      if (matchedCustomer) {
        summary.linkedCustomers += 1;
      }
      if (matchedProduct) {
        summary.linkedProducts += 1;
      }

      if (existing) {
        const existingTimelines = await prisma.inspectionTimeline.findMany({
          where: { orderId: existing.id },
          select: {
            eventType: true,
            eventAt: true,
            content: true,
          },
        });

        const existingTimelineKeys = new Set(
          existingTimelines.map(
            (timeline) =>
              `${timeline.eventType}|${timeline.eventAt?.toISOString() ?? ""}|${normalizeKey(timeline.content)}`,
          ),
        );

        await prisma.$transaction(async (tx) => {
          const sampleRows = await tx.inspectionSample.findMany({
            where: { orderId: existing.id },
            select: { id: true },
          });
          const sampleIds = sampleRows.map((sample) => sample.id);

          if (sampleIds.length) {
            await tx.inspectionSampleItem.deleteMany({
              where: {
                sampleId: {
                  in: sampleIds,
                },
              },
            });
            await tx.inspectionSample.deleteMany({
              where: {
                id: {
                  in: sampleIds,
                },
              },
            });
          }

          await tx.inspectionPayment.deleteMany({
            where: { orderId: existing.id },
          });

          await tx.inspectionOrder.update({
            where: { id: existing.id },
            data: {
              title: candidate.title,
              customerId: matchedCustomer?.id ?? existing.customerId ?? null,
              productId: matchedProduct?.id ?? existing.productId ?? null,
              projectType: candidate.projectType || null,
              inspectionTarget: candidate.inspectionTarget,
              labName: candidate.labName,
              labCity: candidate.labCity || null,
              labAddress: candidate.labAddress || null,
              contactName: candidate.contactName || null,
              contactPhone: candidate.contactPhone || null,
              expectedCycleText: candidate.expectedCycleText || null,
              bankInfo: candidate.bankInfo || null,
              summary: candidate.summary || null,
              remark: candidate.remark || null,
              submittedAt: candidate.submittedAt ? new Date(candidate.submittedAt) : null,
              receivedAt: candidate.receivedAt ? new Date(candidate.receivedAt) : null,
              status: candidate.status,
              paymentStatus: candidate.paymentStatus,
              samples: candidate.samples.length
                ? {
                    create: buildSampleCreateInput(candidate.samples),
                  }
                : undefined,
              payments: candidate.payments.length
                ? {
                    create: buildPaymentCreateInput(candidate.payments, creator.id),
                  }
                : undefined,
            },
          });

          const newTimelines = candidate.timelines.filter((timeline) => {
            const key = `${timeline.eventType}|${timeline.eventAt || ""}|${normalizeKey(timeline.content)}`;
            return !existingTimelineKeys.has(key);
          });

          if (newTimelines.length) {
            await tx.inspectionTimeline.createMany({
              data: buildTimelineCreateManyInput(
                newTimelines,
                existing.id,
                creator.id,
              ),
            });
          }
        });

        summary.updatedOrders += 1;
        summary.orderIds.push(existing.id);
        continue;
      }

      const created = await prisma.inspectionOrder.create({
        data: {
          inspectionNo: nextInspectionNo(),
          title: candidate.title,
          customerId: matchedCustomer?.id,
          productId: matchedProduct?.id,
          projectType: candidate.projectType || null,
          inspectionTarget: candidate.inspectionTarget,
          labName: candidate.labName,
          labCity: candidate.labCity || null,
          labAddress: candidate.labAddress || null,
          contactName: candidate.contactName || null,
          contactPhone: candidate.contactPhone || null,
          expectedCycleText: candidate.expectedCycleText || null,
          bankInfo: candidate.bankInfo || null,
          summary: candidate.summary || null,
          remark: candidate.remark || null,
          submittedAt: candidate.submittedAt ? new Date(candidate.submittedAt) : null,
          receivedAt: candidate.receivedAt ? new Date(candidate.receivedAt) : null,
          status: candidate.status,
          paymentStatus: candidate.paymentStatus,
          createdByUserId: creator.id,
          samples: candidate.samples.length
            ? {
                create: buildSampleCreateInput(candidate.samples),
              }
            : undefined,
          payments: candidate.payments.length
            ? {
                create: buildPaymentCreateInput(candidate.payments, creator.id),
              }
            : undefined,
          timelines: candidate.timelines.length
            ? {
                create: candidate.timelines.map((timeline) => ({
                  eventType: timeline.eventType,
                  eventAt: timeline.eventAt ? new Date(timeline.eventAt) : null,
                  content: timeline.content,
                  createdByUserId: creator.id,
                })),
              }
            : undefined,
        },
        select: { id: true },
      });

      summary.createdOrders += 1;
      summary.orderIds.push(created.id);
    }

    return summary;
  } finally {
    await prisma.$disconnect();
  }
}

function buildImportCandidates(workbook) {
  const rows = workbook.sheets["总表"] ?? [];
  const groups = buildOrderGroups(rows);
  const labDefaults = new Map();
  return groups.map((group) => normalizeInspectionGroup(group, labDefaults));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.workbook)) {
    throw new Error(`文件不存在：${args.workbook}`);
  }

  const workbook = readWorkbookRows(args.workbook);
  const candidates = buildImportCandidates(workbook);
  const previewPayload = buildPreviewPayload(candidates);
  writePreview(args.previewOut, previewPayload);

  if (!args.apply) {
    console.log(
      JSON.stringify(
        {
          mode: "preview",
          workbook: args.workbook,
          ...previewPayload,
        },
        null,
        2,
      ),
    );
    return;
  }

  const applySummary = await applyImport({
    candidates,
    creatorLogin: args.creatorLogin,
  });
  console.log(
    JSON.stringify(
      {
        mode: "apply",
        workbook: args.workbook,
        summary: previewPayload.summary,
        applySummary,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
