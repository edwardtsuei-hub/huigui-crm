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
const defaultWorkbookPath = "/Users/i-datsuei/Downloads/工作表格统整/客户合作跟进表.xlsx";

function parseArgs(argv) {
  const args = {
    workbook: defaultWorkbookPath,
    ownerLogin: "admin",
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
    if (value === "--owner-login" && argv[index + 1]) {
      args.ownerLogin = argv[index + 1];
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

function parseDateLike(value) {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const match = text.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 9, 0, 0);
  }

  return null;
}

function toIsoString(value) {
  const parsed = value instanceof Date ? value : parseDateLike(value);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString();
}

function plusMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function deriveCompanyName(customerName, explicitCompanyName = "") {
  const companyName = normalizeText(explicitCompanyName);
  if (companyName && companyName !== "个人") {
    return companyName;
  }
  const name = normalizeText(customerName);
  if (!name || name === "个人") {
    return "";
  }
  if (/(公司|集团|中心|合作社|基地|农场|科技|渔业|协会|王国|农业|生物|研究院)/.test(name)) {
    return name;
  }
  return "";
}

function isSummaryLikeName(value) {
  const text = normalizeText(value);
  if (!text) {
    return false;
  }
  return /^(汇总|合计|总计|小计|合计行)$/.test(text);
}

function splitContactField(rawValue) {
  const raw = normalizeText(rawValue);
  const normalized = raw.replace(/[，、；;]/g, "\n");
  const lines = splitLines(normalized);
  const mobileMatches = raw.match(/1\d{10}/g) ?? [];
  const mobile = mobileMatches[0] ?? "";
  let wechatId = "";
  const addressParts = [];
  const noteParts = [];

  for (const line of lines) {
    if (!line) {
      continue;
    }
    if (mobile && line.includes(mobile)) {
      const remainder = line.replace(mobile, "").trim();
      if (remainder) {
        addressParts.push(remainder);
      }
      continue;
    }
    if (/^1\d{10}$/.test(line)) {
      continue;
    }
    if (/微信|wechat/i.test(line)) {
      if (!wechatId && !/^微信$/i.test(line)) {
        wechatId = line;
      } else {
        noteParts.push(line);
      }
      continue;
    }
    if (line.length >= 8 || /省|市|区|县|镇|路|街|号|室/.test(line)) {
      addressParts.push(line);
      continue;
    }
    noteParts.push(line);
  }

  return {
    mobile,
    wechatId,
    address: joinParagraphs(addressParts),
    note: joinSentenceParts(noteParts),
    raw,
  };
}

function detectFollowupType(text) {
  if (/微信|朋友圈|视频号|小程序/i.test(text)) {
    return "WECHAT";
  }
  if (/电话|致电|通话|来电/i.test(text)) {
    return "PHONE";
  }
  if (/拜访|走访|参观|到.*基地|线下|实地/.test(text)) {
    return "VISIT";
  }
  if (/会面|见面|会议|沟通|面谈|建群/.test(text)) {
    return "MEETING";
  }
  return "FOLLOW_UP";
}

function deriveCustomerStatus(text) {
  if (/已做第一次|已开始|正在试验|刚收到货|储值|分销|合作推进|已做照片|已发货|购买/.test(text)) {
    return "COOPERATING";
  }
  if (/拜访|走访|参观|会面|面谈|基地/.test(text)) {
    return "MET";
  }
  if (normalizeText(text)) {
    return "CONTACTED";
  }
  return "UNCONTACTED";
}

function parseProgressLine(rawLine, fallbackDate) {
  const line = normalizeText(rawLine);
  if (!line) {
    return null;
  }

  const fallback = fallbackDate ? new Date(fallbackDate) : new Date();
  const dateMatch = line.match(/^(?:(\d{4})\s*[./-])?\s*(\d{1,2})\s*[./月.-]\s*(\d{1,2})(?:日)?/);
  let followupDate = fallbackDate || "";
  let content = line;

  if (dateMatch) {
    const year = dateMatch[1] ? Number(dateMatch[1]) : fallback.getFullYear();
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    const parsed = new Date(year, month - 1, day, 9, 0, 0);
    followupDate = parsed.toISOString();
    content = line.slice(dateMatch[0].length).trim().replace(/^[:：.\-、\s]+/, "");
  }

  return {
    followupDate,
    followupType: detectFollowupType(content || line),
    content: content || line,
    keyPoints: "",
    nextAction: "",
  };
}

function buildCustomerRemark(parts) {
  const lines = uniqueLines(parts);
  return lines.join("\n");
}

function createInitialFollowup({
  followupDate,
  overview,
  needs,
  solution,
  progressHint,
}) {
  const content = joinParagraphs([overview || "已建立初步联系", needs ? `诉求：${needs}` : "", solution ? `建议：${solution}` : ""]);
  if (!content) {
    return null;
  }

  return {
    followupDate: followupDate || "",
    followupType: detectFollowupType(progressHint || content),
    content,
    keyPoints: joinSentenceParts([needs ? `诉求：${needs}` : "", solution ? `建议：${solution}` : ""]),
    nextAction: solution || "",
  };
}

function normalizeCooperationResourceRow(row) {
  const values = row.values;
  const customerName = normalizeText(values["公司/农场名称"]);
  if (!customerName || isSummaryLikeName(customerName)) {
    return null;
  }

  const contactField = splitContactField(values["联系方式/地址"]);
  const contactDate = toIsoString(values["对接时间"]);
  const overview = normalizeText(values["概况/简介"]);
  const needs = normalizeText(values["诉求/问题"]);
  const solution = normalizeText(values["解决方案、建议"]);
  const cooperationMode = normalizeText(values["合作方式"]);
  const progressText = normalizeText(values["跟进进程"]);
  const progressLines = splitLines(progressText);
  const followups = [];
  const initialFollowup = createInitialFollowup({
    followupDate: contactDate,
    overview,
    needs,
    solution,
    progressHint: progressText,
  });

  if (initialFollowup) {
    followups.push(initialFollowup);
  }

  for (const line of progressLines) {
    const parsed = parseProgressLine(line, contactDate);
    if (parsed) {
      followups.push(parsed);
    }
  }

  const source = joinSentenceParts([
    normalizeText(values["视频号/小程序"]),
    "客户合作跟进表/合作资源",
  ]);

  return {
    sourceSheet: "合作资源",
    sourceRow: row.rowNumber,
    sourceRefs: [`合作资源#${row.rowNumber}`],
    customerName,
    companyName: deriveCompanyName(customerName),
    contactName: normalizeText(values["负责人/对接人"]),
    mobile: contactField.mobile,
    wechatId: contactField.wechatId,
    city: normalizeText(values["所在城市"]),
    address: contactField.address,
    source,
    status: deriveCustomerStatus(`${progressText}\n${cooperationMode}\n${solution}`),
    cooperationDirection: joinSentenceParts([needs, cooperationMode]),
    cooperationContent: joinParagraphs([overview, solution]),
    estimatedAmount: "",
    dealProbability: "",
    remark: buildCustomerRemark([
      normalizeText(values["合作等级"]) ? `合作等级：${normalizeText(values["合作等级"])}` : "",
      contactField.note ? `联系方式备注：${contactField.note}` : "",
      !contactField.mobile && contactField.raw ? `原始联系方式：${contactField.raw}` : "",
      progressText ? `原始跟进进程：\n${progressText}` : "",
    ]),
    followups,
  };
}

function normalizeNewResourceRow(row) {
  const values = row.values;
  const rawCustomerName = normalizeText(values["客户姓名"]);
  const rawCompanyName = normalizeText(values["公司名称"]);
  const customerName = rawCompanyName && rawCompanyName !== "个人" ? rawCompanyName : rawCustomerName;
  if (!customerName || isSummaryLikeName(customerName) || isSummaryLikeName(rawCompanyName)) {
    return null;
  }

  const contactField = splitContactField(values["联系方式"]);
  const addressField = splitContactField(values["地址"]);
  const followupDate = toIsoString(values["建立联系日期"]);
  const progress = normalizeText(values["跟进进度"]);
  const followup = {
    followupDate,
    followupType: detectFollowupType(`${normalizeText(values["拓展渠道/方式"])} ${progress}`),
    content: progress || "已建立联系",
    keyPoints: normalizeText(values["跟进效果"]),
    nextAction: "",
  };

  return {
    sourceSheet: "新增资源",
    sourceRow: row.rowNumber,
    sourceRefs: [`新增资源#${row.rowNumber}`],
    customerName,
    companyName: deriveCompanyName(customerName, rawCompanyName),
    contactName: rawCompanyName && rawCompanyName !== "个人" ? rawCustomerName : "",
    mobile: contactField.mobile,
    wechatId: contactField.wechatId,
    city: normalizeText(values["地址"]),
    address: addressField.address || normalizeText(values["地址"]),
    source: joinSentenceParts([normalizeText(values["拓展渠道/方式"]), "客户合作跟进表/新增资源"]),
    status: deriveCustomerStatus(progress),
    cooperationDirection: "",
    cooperationContent: normalizeText(values["公司主营/业务范围"]),
    estimatedAmount: "",
    dealProbability: "",
    remark: buildCustomerRemark([
      contactField.note ? `联系方式备注：${contactField.note}` : "",
      normalizeText(values["跟进效果"]) ? `跟进效果：${normalizeText(values["跟进效果"])}` : "",
    ]),
    followups: [followup],
  };
}

function normalizeKey(value) {
  return compactText(value).toLowerCase();
}

function candidateKey(candidate) {
  if (candidate.mobile) {
    return `mobile:${candidate.mobile}`;
  }
  return `name:${normalizeKey(candidate.customerName)}|city:${normalizeKey(candidate.city)}`;
}

function mergeCandidates(target, source) {
  target.sourceRefs = uniqueLines([...(target.sourceRefs ?? []), ...(source.sourceRefs ?? [])]);

  for (const key of ["companyName", "contactName", "mobile", "wechatId", "city", "address", "source", "cooperationDirection", "cooperationContent", "remark"]) {
    if (!normalizeText(target[key]) && normalizeText(source[key])) {
      target[key] = source[key];
    } else if (key === "remark" && normalizeText(source[key])) {
      target[key] = buildCustomerRemark([target[key], source[key]]);
    } else if (key === "cooperationContent" && normalizeText(source[key]) && normalizeText(target[key]) && target[key] !== source[key]) {
      target[key] = joinParagraphs([target[key], source[key]]);
    } else if (key === "source" && normalizeText(source[key]) && normalizeText(target[key]) && target[key] !== source[key]) {
      target[key] = joinSentenceParts([target[key], source[key]]);
    }
  }

  const statusRank = {
    UNCONTACTED: 0,
    CONTACTED: 1,
    MET: 2,
    COOPERATING: 3,
    PAUSED: 4,
  };
  if ((statusRank[source.status] ?? 0) > (statusRank[target.status] ?? 0)) {
    target.status = source.status;
  }

  const existingFollowupKeys = new Set(
    target.followups.map((item) => `${item.followupDate}|${normalizeKey(item.content)}`),
  );
  for (const followup of source.followups) {
    const key = `${followup.followupDate}|${normalizeKey(followup.content)}`;
    if (!existingFollowupKeys.has(key)) {
      target.followups.push(followup);
      existingFollowupKeys.add(key);
    }
  }
}

function buildImportCandidates(workbook) {
  const candidates = [];
  for (const row of workbook.sheets["合作资源"] ?? []) {
    const candidate = normalizeCooperationResourceRow(row);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  for (const row of workbook.sheets["新增资源"] ?? []) {
    const candidate = normalizeNewResourceRow(row);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  const merged = new Map();
  for (const candidate of candidates) {
    const key = candidateKey(candidate);
    if (!merged.has(key)) {
      merged.set(key, candidate);
      continue;
    }
    mergeCandidates(merged.get(key), candidate);
  }

  return [...merged.values()];
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

function findExistingCustomer(existingCustomers, candidate) {
  const candidateMobile = normalizeText(candidate.mobile);
  const candidateName = normalizeKey(candidate.customerName);
  const candidateCompany = normalizeKey(candidate.companyName);
  const candidateCity = normalizeKey(candidate.city);

  return existingCustomers.find((item) => {
    if (candidateMobile && item.mobile && normalizeText(item.mobile) === candidateMobile) {
      return true;
    }

    const names = [item.customerName, item.companyName].map(normalizeKey).filter(Boolean);
    const nameMatched =
      (candidateName && names.includes(candidateName)) ||
      (candidateCompany && names.includes(candidateCompany));

    if (!nameMatched) {
      return false;
    }

    if (!candidateCity || !item.city) {
      return true;
    }

    return normalizeKey(item.city) === candidateCity;
  });
}

function buildCustomerUpdate(existing, candidate) {
  const patch = {};
  const fillableKeys = [
    "companyName",
    "contactName",
    "mobile",
    "wechatId",
    "city",
    "address",
    "source",
    "cooperationDirection",
    "cooperationContent",
  ];

  for (const key of fillableKeys) {
    if (!normalizeText(existing[key]) && normalizeText(candidate[key])) {
      patch[key] = candidate[key];
    }
  }

  if (!normalizeText(existing.remark) && normalizeText(candidate.remark)) {
    patch.remark = candidate.remark;
  } else if (normalizeText(candidate.remark) && normalizeText(existing.remark) && !existing.remark.includes(candidate.remark)) {
    patch.remark = buildCustomerRemark([existing.remark, candidate.remark]);
  }

  const statusRank = {
    UNCONTACTED: 0,
    CONTACTED: 1,
    MET: 2,
    COOPERATING: 3,
    PAUSED: 4,
  };
  if ((statusRank[candidate.status] ?? 0) > (statusRank[existing.status] ?? 0)) {
    patch.status = candidate.status;
  }

  return patch;
}

async function applyImport({ candidates, ownerLogin }) {
  const prisma = new PrismaClient();
  try {
    const owner =
      (await prisma.user.findFirst({
        where: {
          status: "ACTIVE",
          OR: [{ loginAccount: ownerLogin }, { name: ownerLogin }],
        },
        select: { id: true, name: true, loginAccount: true },
      })) ??
      (await prisma.user.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, loginAccount: true },
      }));

    if (!owner) {
      throw new Error("没有可用的负责人用户，无法执行导入");
    }

    const existingCustomers = await prisma.customer.findMany({
      select: {
        id: true,
        customerName: true,
        companyName: true,
        contactName: true,
        mobile: true,
        wechatId: true,
        city: true,
        address: true,
        source: true,
        status: true,
        cooperationDirection: true,
        cooperationContent: true,
        remark: true,
      },
    });

    const summary = {
      owner: owner.loginAccount || owner.name,
      createdCustomers: 0,
      updatedCustomers: 0,
      createdFollowups: 0,
      skippedFollowups: 0,
    };

    for (const candidate of candidates) {
      const matched = findExistingCustomer(existingCustomers, candidate);
      let customerId = matched?.id;

      if (!matched) {
        const now = new Date();
        const created = await prisma.customer.create({
          data: {
            customerName: candidate.customerName,
            companyName: candidate.companyName || null,
            contactName: candidate.contactName || null,
            mobile: candidate.mobile || null,
            wechatId: candidate.wechatId || null,
            city: candidate.city || null,
            address: candidate.address || null,
            source: candidate.source || null,
            status: candidate.status || "CONTACTED",
            ownerUserId: owner.id,
            ownerAssignedAt: now,
            ownerProtectionMonths: 3,
            ownerProtectedUntil: plusMonths(now, 3),
            cooperationDirection: candidate.cooperationDirection || null,
            cooperationContent: candidate.cooperationContent || null,
            remark: candidate.remark || null,
          },
          select: {
            id: true,
            customerName: true,
            companyName: true,
            contactName: true,
            mobile: true,
            wechatId: true,
            city: true,
            address: true,
            source: true,
            status: true,
            cooperationDirection: true,
            cooperationContent: true,
            remark: true,
          },
        });
        existingCustomers.push(created);
        customerId = created.id;
        summary.createdCustomers += 1;
      } else {
        const patch = buildCustomerUpdate(matched, candidate);
        if (Object.keys(patch).length) {
          const updated = await prisma.customer.update({
            where: { id: matched.id },
            data: patch,
            select: {
              id: true,
              customerName: true,
              companyName: true,
              contactName: true,
              mobile: true,
              wechatId: true,
              city: true,
              address: true,
              source: true,
              status: true,
              cooperationDirection: true,
              cooperationContent: true,
              remark: true,
            },
          });
          const targetIndex = existingCustomers.findIndex((item) => item.id === updated.id);
          existingCustomers[targetIndex] = updated;
          summary.updatedCustomers += 1;
        }
      }

      const existingFollowups = await prisma.customerFollowup.findMany({
        where: { customerId },
        select: { followupDate: true, content: true },
      });
      const followupKeys = new Set(
        existingFollowups.map((item) => `${new Date(item.followupDate).toISOString()}|${normalizeKey(item.content)}`),
      );

      for (const followup of candidate.followups) {
        const followupDate = followup.followupDate
          ? new Date(followup.followupDate)
          : new Date();
        const key = `${followupDate.toISOString()}|${normalizeKey(followup.content)}`;

        if (followupKeys.has(key)) {
          summary.skippedFollowups += 1;
          continue;
        }

        await prisma.customerFollowup.create({
          data: {
            customerId,
            followupDate,
            followupType: followup.followupType || "FOLLOW_UP",
            content: followup.content,
            keyPoints: followup.keyPoints || null,
            nextAction: followup.nextAction || null,
            creatorUserId: owner.id,
            needReminder: false,
          },
        });
        followupKeys.add(key);
        summary.createdFollowups += 1;
      }
    }

    return summary;
  } finally {
    await prisma.$disconnect();
  }
}

function buildPreviewPayload(candidates, workbookPath, ownerLogin) {
  return {
    workbookPath,
    ownerLogin,
    candidateCount: candidates.length,
    followupCount: candidates.reduce((sum, item) => sum + item.followups.length, 0),
    sheetCoverage: {
      cooperationResources: candidates.filter((item) => item.sourceRefs?.some((ref) => ref.startsWith("合作资源#"))).length,
      newResources: candidates.filter((item) => item.sourceRefs?.some((ref) => ref.startsWith("新增资源#"))).length,
    },
    candidates: candidates.map((item) => ({
      customerName: item.customerName,
      companyName: item.companyName,
      contactName: item.contactName,
      mobile: item.mobile,
      wechatId: item.wechatId,
      city: item.city,
      address: item.address,
      status: item.status,
      source: item.source,
      cooperationDirection: item.cooperationDirection,
      cooperationContent: item.cooperationContent,
      remark: item.remark,
      followupCount: item.followups.length,
      followups: item.followups,
      sources: item.sourceRefs?.length ? item.sourceRefs : [`${item.sourceSheet}#${item.sourceRow}`],
    })),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.workbook)) {
    throw new Error(`未找到文件：${args.workbook}`);
  }

  const workbook = readWorkbookRows(args.workbook);
  const candidates = buildImportCandidates(workbook);
  const previewPayload = buildPreviewPayload(candidates, args.workbook, args.ownerLogin);

  writePreview(args.previewOut, previewPayload);

  console.log(JSON.stringify({
    mode: args.apply ? "apply" : "dry-run",
    workbook: args.workbook,
    ownerLogin: args.ownerLogin,
    candidateCount: previewPayload.candidateCount,
    followupCount: previewPayload.followupCount,
    sampleCustomers: previewPayload.candidates.slice(0, 8),
  }, null, 2));

  if (!args.apply) {
    return;
  }

  const summary = await applyImport({
    candidates,
    ownerLogin: args.ownerLogin,
  });
  console.log(JSON.stringify({ mode: "apply-completed", ...summary }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
