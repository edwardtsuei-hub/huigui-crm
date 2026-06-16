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
const defaultWorkbookPath =
  "/Users/i-datsuei/Downloads/工作表格统整/海能量购买客户明细表.xlsx";

function parseArgs(argv) {
  const args = {
    workbook: defaultWorkbookPath,
    ownerLogin: "admin",
    apply: false,
    compareDb: false,
    previewOut: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--apply") {
      args.apply = true;
      continue;
    }
    if (value === "--compare-db") {
      args.compareDb = true;
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

function isSummaryLikeName(value) {
  const text = normalizeText(value);
  if (!text) {
    return false;
  }
  return /^(汇总|合计|总计|小计|合计行)$/.test(text);
}

function deriveCompanyName(customerName, identity = "") {
  const name = normalizeText(customerName);
  const scene = normalizeText(identity);
  if (!name) {
    return "";
  }
  if (scene === "公司" || /(公司|集团|中心|合作社|基地|农场|科技|渔业|协会|农业|生物|研究院)/.test(name)) {
    return name;
  }
  return "";
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
    if (line.length >= 6 || /省|市|区|县|镇|路|街|号|室|栋|单元/.test(line)) {
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

function deriveCityFromAddress(rawAddress) {
  const text = normalizeText(rawAddress);
  if (!text) {
    return "";
  }

  const municipalityMatch = text.match(/(北京|上海|天津|重庆)(市)?/);
  if (municipalityMatch) {
    return municipalityMatch[1];
  }

  const cityMatch = text.match(/([^\s,，、；;]{2,12}(?:市|州|盟|地区))/);
  if (cityMatch) {
    return cityMatch[1];
  }

  const districtMatch = text.match(/([^\s,，、；;]{2,12}(?:区|县))/);
  if (districtMatch) {
    return districtMatch[1];
  }

  return "";
}

function derivePurchaseStatus({ purchaseDate, amount, purchaseGoal, usageFollowup }) {
  if (purchaseDate || amount > 0) {
    return "COOPERATING";
  }
  if (normalizeText(purchaseGoal) || normalizeText(usageFollowup)) {
    return "CONTACTED";
  }
  return "UNCONTACTED";
}

function formatAmount(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return normalizeText(value);
  }
  if (Number.isInteger(numeric)) {
    return String(numeric);
  }
  return String(numeric);
}

function buildCustomerRemark(parts) {
  return uniqueLines(parts).join("\n");
}

function buildPurchaseFollowup({
  purchaseDate,
  identity,
  products,
  specs,
  amount,
  plantingArea,
  crops,
  pastMethod,
  problems,
  purchaseGoal,
  usageFollowup,
}) {
  const content = joinParagraphs([
    joinSentenceParts([
      identity ? `客户类型：${identity}` : "",
      products ? `购买元素：${products}` : "",
      specs ? `规格数量：${specs}` : "",
      amount ? `付款金额：${formatAmount(amount)} 元` : "",
    ]),
    plantingArea ? `种植面积：${plantingArea}` : "",
    crops ? `种植作物：${crops}` : "",
    purchaseGoal ? `购买目的：${purchaseGoal}` : "",
    usageFollowup ? `使用跟进：${usageFollowup}` : "",
  ]);

  return {
    followupDate: purchaseDate || "",
    followupType: "FOLLOW_UP",
    content: content || "已记录购买背景",
    keyPoints: joinSentenceParts([
      problems ? `当前问题：${problems}` : "",
      pastMethod ? `过往种植方式：${pastMethod}` : "",
    ]),
    nextAction: usageFollowup || purchaseGoal || "",
  };
}

function normalizePurchaseRow(row) {
  const values = row.values;
  const customerName = normalizeText(values["客户"]);
  if (!customerName || isSummaryLikeName(customerName)) {
    return null;
  }

  const identity = normalizeText(values["家庭/公司/农场"]);
  const rawAddress = normalizeText(values["收件地址"]);
  const contactField = splitContactField(rawAddress);
  const purchaseDate = toIsoString(values["购买日期"]);
  const products = normalizeText(values["购买元素"]);
  const specs = normalizeText(values["购买规格/数量"]);
  const amount = values["付款金额"] === null || values["付款金额"] === undefined
    ? 0
    : Number(values["付款金额"]) || 0;
  const plantingArea = normalizeText(values["种植面积"]);
  const crops = normalizeText(values["种植作物"]);
  const pastMethod = normalizeText(values["过往种植方式"]);
  const problems = normalizeText(values["种植存在问题"]);
  const purchaseGoal = normalizeText(values["购买目的"]);
  const usageFollowup = normalizeText(values["使用问题跟进"]);

  return {
    sourceSheet: "客户购买明细",
    sourceRow: row.rowNumber,
    sourceRefs: [`客户购买明细#${row.rowNumber}`],
    customerName,
    companyName: deriveCompanyName(customerName, identity),
    contactName: "",
    mobile: contactField.mobile,
    wechatId: contactField.wechatId,
    city: deriveCityFromAddress(rawAddress),
    address: contactField.address || rawAddress,
    source: "海能量购买客户明细表/客户购买明细",
    status: derivePurchaseStatus({ purchaseDate, amount, purchaseGoal, usageFollowup }),
    cooperationDirection: joinSentenceParts([
      identity ? `${identity}场景` : "",
      purchaseGoal ? `购买目的：${purchaseGoal}` : "",
      products ? `已购：${products}` : "",
    ]),
    cooperationContent: joinParagraphs([
      joinSentenceParts([
        products ? `购买元素：${products}` : "",
        specs ? `规格数量：${specs}` : "",
        amount ? `付款金额：${formatAmount(amount)} 元` : "",
      ]),
      plantingArea ? `种植面积：${plantingArea}` : "",
      crops ? `种植作物：${crops}` : "",
      usageFollowup ? `使用跟进：${usageFollowup}` : "",
    ]),
    estimatedAmount: "",
    dealProbability: "",
    remark: buildCustomerRemark([
      identity ? `客户类型：${identity}` : "",
      pastMethod ? `过往种植方式：${pastMethod}` : "",
      problems ? `种植存在问题：${problems}` : "",
      contactField.note ? `联系方式备注：${contactField.note}` : "",
      !contactField.mobile && contactField.raw ? `原始收件地址：${contactField.raw}` : "",
    ]),
    followups: [
      buildPurchaseFollowup({
        purchaseDate,
        identity,
        products,
        specs,
        amount,
        plantingArea,
        crops,
        pastMethod,
        problems,
        purchaseGoal,
        usageFollowup,
      }),
    ],
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

  for (const key of [
    "companyName",
    "contactName",
    "mobile",
    "wechatId",
    "city",
    "address",
    "source",
    "cooperationDirection",
    "cooperationContent",
    "remark",
  ]) {
    if (!normalizeText(target[key]) && normalizeText(source[key])) {
      target[key] = source[key];
    } else if (key === "remark" && normalizeText(source[key])) {
      target[key] = buildCustomerRemark([target[key], source[key]]);
    } else if (
      key === "cooperationContent" &&
      normalizeText(source[key]) &&
      normalizeText(target[key]) &&
      target[key] !== source[key]
    ) {
      target[key] = joinParagraphs([target[key], source[key]]);
    } else if (
      key === "source" &&
      normalizeText(source[key]) &&
      normalizeText(target[key]) &&
      target[key] !== source[key]
    ) {
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
  for (const row of workbook.sheets["客户购买明细"] ?? []) {
    const candidate = normalizePurchaseRow(row);
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
  } else if (
    normalizeText(candidate.remark) &&
    normalizeText(existing.remark) &&
    !existing.remark.includes(candidate.remark)
  ) {
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

async function buildCompareSummary(candidates) {
  const prisma = new PrismaClient();
  try {
    const existingCustomers = await prisma.customer.findMany({
      select: {
        id: true,
        customerName: true,
        companyName: true,
        mobile: true,
        city: true,
      },
    });

    const compared = candidates.map((candidate) => {
      const matched = findExistingCustomer(existingCustomers, candidate);
      return {
        ...candidate,
        matchedCustomerId: matched?.id || "",
        matchedCustomerName: matched?.customerName || "",
        matchedBy: matched
          ? (candidate.mobile && matched.mobile && normalizeText(candidate.mobile) === normalizeText(matched.mobile)
            ? "mobile"
            : "name_or_company")
          : "",
      };
    });

    return {
      compared,
      summary: {
        matchedExistingCustomers: compared.filter((item) => item.matchedCustomerId).length,
        newCustomers: compared.filter((item) => !item.matchedCustomerId).length,
      },
    };
  } finally {
    await prisma.$disconnect();
  }
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
        existingFollowups.map(
          (item) => `${new Date(item.followupDate).toISOString()}|${normalizeKey(item.content)}`,
        ),
      );

      for (const followup of candidate.followups) {
        const followupDate = followup.followupDate ? new Date(followup.followupDate) : new Date();
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

function buildPreviewPayload(candidates, workbookPath, ownerLogin, compareSummary = null) {
  const comparedCandidates = compareSummary?.compared ?? candidates;
  return {
    workbookPath,
    ownerLogin,
    candidateCount: comparedCandidates.length,
    followupCount: comparedCandidates.reduce((sum, item) => sum + item.followups.length, 0),
    compareSummary: compareSummary?.summary ?? null,
    candidates: comparedCandidates.map((item) => ({
      customerName: item.customerName,
      companyName: item.companyName,
      mobile: item.mobile,
      city: item.city,
      address: item.address,
      status: item.status,
      source: item.source,
      cooperationDirection: item.cooperationDirection,
      cooperationContent: item.cooperationContent,
      remark: item.remark,
      matchedCustomerId: item.matchedCustomerId || "",
      matchedCustomerName: item.matchedCustomerName || "",
      matchedBy: item.matchedBy || "",
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
  const compareSummary = args.compareDb || args.apply
    ? await buildCompareSummary(candidates)
    : null;
  const applyCandidates = compareSummary?.compared ?? candidates;
  const previewPayload = buildPreviewPayload(
    candidates,
    args.workbook,
    args.ownerLogin,
    compareSummary,
  );

  writePreview(args.previewOut, previewPayload);

  console.log(
    JSON.stringify(
      {
        mode: args.apply ? "apply" : "dry-run",
        workbook: args.workbook,
        ownerLogin: args.ownerLogin,
        candidateCount: previewPayload.candidateCount,
        followupCount: previewPayload.followupCount,
        compareSummary: previewPayload.compareSummary,
        sampleCustomers: previewPayload.candidates.slice(0, 8),
      },
      null,
      2,
    ),
  );

  if (!args.apply) {
    return;
  }

  const summary = await applyImport({
    candidates: applyCandidates,
    ownerLogin: args.ownerLogin,
  });
  console.log(JSON.stringify({ mode: "apply-completed", ...summary }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
