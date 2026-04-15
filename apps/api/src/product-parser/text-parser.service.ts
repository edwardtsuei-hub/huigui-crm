import { Injectable } from "@nestjs/common";
import type {
  ProductFieldExtraction,
  ProductParseConfidence,
  ProductParseDraft,
  ProductParseFieldKey
} from "./product-parser.types";

const APPLICABLE_UNITS = ["ml", "mL", "ML", "L", "l", "g", "G", "kg", "KG", "克", "千克", "毫升", "升", "片", "包", "袋", "桶", "盒", "支", "瓶"];

type IndustrySuggestion = {
  group?: string;
  subgroup?: string;
  confidence?: ProductParseConfidence;
  reason?: string;
};

@Injectable()
export class TextParserService {
  parse(rawText: string, source: "text" | "image" = "text"): ProductParseDraft {
    const cleanedText = this.cleanText(rawText);
    const draft: ProductParseDraft = {
      rawText: cleanedText,
      fields: {}
    };

    if (!cleanedText) {
      return draft;
    }

    const lines = this.toLines(cleanedText);

    this.setField(draft, "name", this.extractName(cleanedText, lines, source));

    const nameValue = draft.fields.name?.value;
    if (nameValue) {
      this.setField(draft, "displayName", {
        value: nameValue,
        confidence: draft.fields.name?.confidence === "high" ? "medium" : "low",
        source: draft.fields.name?.source ?? source,
        reason: "默认沿用识别到的产品名称作为对外显示名称建议"
      });
    }

    const specValue = this.extractSpec(cleanedText, source);
    this.setField(draft, "spec", specValue);

    const unitValue = this.extractUnit(specValue?.value, cleanedText, source);
    this.setField(draft, "unit", unitValue);

    this.setField(draft, "enterpriseStandardNo", this.extractStandardNo(cleanedText, source));
    this.setField(draft, "intro", this.extractIntro(cleanedText, lines, source));
    this.setField(draft, "scenarios", this.extractScenarios(cleanedText, source));
    this.setField(draft, "labelText", this.extractLabelText(cleanedText, source));
    this.setField(draft, "remark", this.extractRemark(cleanedText, source));

    const industrySuggestion = this.suggestIndustry(cleanedText);
    if (industrySuggestion.group) {
      this.setField(draft, "industryGroupSuggestion", {
        value: industrySuggestion.group,
        confidence: industrySuggestion.confidence ?? "medium",
        source: "rule",
        reason: industrySuggestion.reason ?? "依据命中关键词生成行业建议"
      });
    }

    if (industrySuggestion.subgroup) {
      this.setField(draft, "industrySubgroupSuggestion", {
        value: industrySuggestion.subgroup,
        confidence: industrySuggestion.confidence ?? "medium",
        source: "rule",
        reason: "根据命中词推断细分行业建议"
      });
    }

    const outputTemplateSuggestion = this.suggestOutputTemplate(cleanedText, industrySuggestion.group);
    this.setField(draft, "outputTemplateTypeSuggestion", outputTemplateSuggestion);

    return draft;
  }

  private setField(
    draft: ProductParseDraft,
    key: ProductParseFieldKey,
    value?: ProductFieldExtraction
  ) {
    if (!value?.value?.trim()) {
      return;
    }
    draft.fields[key] = {
      ...value,
      value: value.value.trim()
    };
  }

  private cleanText(rawText: string) {
    return rawText
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[^\S\n]{2,}/g, " ")
      .trim();
  }

  private toLines(rawText: string) {
    return rawText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  private extractByLabel(
    rawText: string,
    labels: string[],
    confidence: ProductParseConfidence,
    source: "text" | "image",
    reason: string,
    maxLength = 80
  ) {
    for (const label of labels) {
      const pattern = new RegExp(`${label}\\s*[：:]\\s*([^\\n]{2,${maxLength}})`, "i");
      const match = rawText.match(pattern);
      if (match?.[1]) {
        return {
          value: match[1].trim(),
          confidence,
          source,
          reason
        } satisfies ProductFieldExtraction;
      }
    }

    return undefined;
  }

  private extractName(rawText: string, lines: string[], source: "text" | "image") {
    const explicit = this.extractByLabel(
      rawText,
      ["产品名称", "品名", "名称", "商品名称"],
      "high",
      source,
      "通过“品名 / 产品名称 / 名称”标记提取"
    );

    if (explicit) {
      return explicit;
    }

    const candidate = lines
      .slice(0, 6)
      .filter((line) => line.length >= 2 && line.length <= 24)
      .filter((line) => !/(规格|净含量|执行标准|适用于|使用方法|储存|贮存|注意事项)/.test(line))
      .sort((left, right) => right.length - left.length)[0];

    if (!candidate) {
      return undefined;
    }

    return {
      value: candidate,
      confidence: "medium",
      source,
      reason: "通过首屏标题样式的主文本推断产品名称"
    } satisfies ProductFieldExtraction;
  }

  private extractSpec(rawText: string, source: "text" | "image") {
    const explicit = this.extractByLabel(
      rawText,
      ["规格", "包装规格", "净含量", "含量"],
      "high",
      source,
      "通过“规格 / 净含量”字段提取",
      40
    );

    if (explicit) {
      return explicit;
    }

    const match = rawText.match(
      /(\d+(?:\.\d+)?\s*(?:ml|mL|ML|l|L|g|G|kg|KG|克|千克|毫升|升|片|包|袋|桶|盒|支|瓶)(?:\s*\/\s*(?:箱|瓶|包|袋|桶|盒|支))?)/i
    );

    if (!match?.[1]) {
      return undefined;
    }

    return {
      value: match[1].replace(/\s+/g, ""),
      confidence: "medium",
      source,
      reason: "从文本中的规格表达式中识别"
    } satisfies ProductFieldExtraction;
  }

  private extractUnit(spec: string | undefined, rawText: string, source: "text" | "image") {
    const explicit = this.extractByLabel(
      rawText,
      ["单位"],
      "high",
      source,
      "通过“单位”字段提取",
      8
    );

    if (explicit) {
      return explicit;
    }

    if (!spec) {
      return undefined;
    }

    const packageUnit = spec.match(/\/\s*([箱瓶包袋桶盒支片袋]+)/);
    if (packageUnit?.[1]) {
      return {
        value: packageUnit[1],
        confidence: "medium",
        source,
        reason: "从规格中的包装单位推断"
      } satisfies ProductFieldExtraction;
    }

    const baseUnit = APPLICABLE_UNITS.find((unit) => spec.endsWith(unit));
    if (!baseUnit) {
      return undefined;
    }

    return {
      value: baseUnit,
      confidence: "medium",
      source,
      reason: "从规格字段中拆解得到单位"
    } satisfies ProductFieldExtraction;
  }

  private extractStandardNo(rawText: string, source: "text" | "image") {
    const match = rawText.match(
      /(Q\/[A-Za-z0-9\u4e00-\u9fa5\-/.]+(?:-\d{4})?|GB\/T\s*[A-Za-z0-9.\-]+|GB\s*[A-Za-z0-9.\-]+|NY\/T\s*[A-Za-z0-9.\-]+|QB\/T\s*[A-Za-z0-9.\-]+|DB\s*[A-Za-z0-9.\-]+)/i
    );

    if (!match?.[1]) {
      return undefined;
    }

    return {
      value: match[1].replace(/\s+/g, ""),
      confidence: match[1].startsWith("Q/") ? "high" : "medium",
      source,
      reason: "匹配到标准号模式"
    } satisfies ProductFieldExtraction;
  }

  private extractIntro(rawText: string, lines: string[], source: "text" | "image") {
    const candidateLines = lines.filter(
      (line) =>
        !/(产品名称|品名|名称|规格|净含量|执行标准|适用于|可用于|用于|适合|注意事项|使用方法|贮存)/.test(
          line
        )
    );

    const joined = candidateLines.join(" ");
    const normalized = joined.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return undefined;
    }

    const intro = normalized.length > 180 ? `${normalized.slice(0, 180)}...` : normalized;
    if (intro.length < 30) {
      return undefined;
    }

    return {
      value: intro,
      confidence: "medium",
      source,
      reason: "从标签主体文案中提炼出简介摘要"
    } satisfies ProductFieldExtraction;
  }

  private extractScenarios(rawText: string, source: "text" | "image") {
    const matches = Array.from(
      rawText.matchAll(/((?:适用于|可用于|用于|适合)[^。；;\n]{4,80})/g)
    )
      .map((match) => match[1]?.trim())
      .filter(Boolean)
      .slice(0, 3);

    if (!matches.length) {
      return undefined;
    }

    return {
      value: matches.join("；"),
      confidence: "high",
      source,
      reason: "命中了“适用于 / 可用于 / 用于 / 适合”等适用场景描述"
    } satisfies ProductFieldExtraction;
  }

  private extractLabelText(rawText: string, source: "text" | "image") {
    if (rawText.length < 10) {
      return undefined;
    }

    return {
      value: rawText.length > 1200 ? `${rawText.slice(0, 1200)}...` : rawText,
      confidence: "high",
      source,
      reason: "保留原始标签主体文本，供人工二次编辑"
    } satisfies ProductFieldExtraction;
  }

  private extractRemark(rawText: string, source: "text" | "image") {
    const remarkMatches = Array.from(
      rawText.matchAll(/((?:注意事项|贮存条件|储存方式|建议|提示)[：:]?[^。；;\n]{4,80})/g)
    )
      .map((match) => match[1]?.trim())
      .filter(Boolean);

    if (remarkMatches.length) {
      return {
        value: remarkMatches.slice(0, 2).join("；"),
        confidence: "medium",
        source,
        reason: "从注意事项或贮存建议中提取备注建议"
      } satisfies ProductFieldExtraction;
    }

    return {
      value: "建议人工确认成本价、建议售价、权限可见性与是否启用。",
      confidence: "low",
      source: "rule",
      reason: "根据第一版规则生成的人工确认提示"
    } satisfies ProductFieldExtraction;
  }

  private suggestIndustry(rawText: string): IndustrySuggestion {
    const normalized = rawText.toLowerCase();
    const buckets = [
      {
        group: "农业",
        subgroup: this.pickAgricultureSubgroup(normalized),
        keywords: ["土壤", "叶面", "种植", "作物", "农业", "施用", "浸种", "肥", "育苗", "果树", "蔬菜"]
      },
      {
        group: "养殖业",
        subgroup: this.pickBreedingSubgroup(normalized),
        keywords: ["养殖", "猪", "牛", "鸡", "虾", "水体", "畜舍", "粪污", "饲料", "栏舍"]
      },
      {
        group: "工业",
        subgroup: this.pickIndustrySubgroup(normalized),
        keywords: ["油污", "清洗", "工业", "设备", "机械", "管道", "光伏", "外墙", "除垢"]
      },
      {
        group: "服务业",
        subgroup: this.pickServiceSubgroup(normalized),
        keywords: ["门店", "餐饮", "客房", "康养", "清洁服务", "高端服务", "室内环境", "酒店"]
      }
    ]
      .map((bucket) => ({
        ...bucket,
        score: bucket.keywords.reduce(
          (sum, keyword) => sum + (normalized.includes(keyword.toLowerCase()) ? 1 : 0),
          0
        )
      }))
      .sort((left, right) => right.score - left.score);

    const best = buckets[0];
    if (!best || best.score === 0) {
      return {};
    }

    return {
      group: best.group,
      subgroup: best.subgroup,
      confidence: best.score >= 3 ? "high" : best.score === 2 ? "medium" : "low",
      reason: `根据关键词命中自动建议为${best.group}`
    };
  }

  private pickAgricultureSubgroup(rawText: string) {
    if (/(苹果|柑橘|橙|葡萄|果树|柚|桃|梨)/.test(rawText)) return "果树种植";
    if (/(水稻|小麦|玉米|高粱|粮食|谷物)/.test(rawText)) return "粮食作物";
    if (/(花卉|苗木|园艺)/.test(rawText)) return "花卉苗木";
    return "蔬菜种植";
  }

  private pickBreedingSubgroup(rawText: string) {
    if (/(虾|鱼|蟹|池塘|水体|水产)/.test(rawText)) return "水产养殖";
    if (/(饲料|营养|配方)/.test(rawText)) return "饲料配套";
    return "畜禽养殖";
  }

  private pickIndustrySubgroup(rawText: string) {
    if (/(食品|餐饮工厂|饮料)/.test(rawText)) return "食品加工";
    if (/(化学|除垢|溶剂|乳化|配方)/.test(rawText)) return "化工制造";
    return "装备制造";
  }

  private pickServiceSubgroup(rawText: string) {
    if (/(农业技术|种植方案|驻场)/.test(rawText)) return "农业技术服务";
    if (/(渠道|经销|招商)/.test(rawText)) return "渠道服务";
    return "品牌咨询";
  }

  private suggestOutputTemplate(rawText: string, industryGroup?: string) {
    if (industryGroup === "农业") {
      return {
        value: "AGRICULTURE_PLAN",
        confidence: "high",
        source: "rule",
        reason: "农业场景默认推荐农业方案模板"
      } satisfies ProductFieldExtraction;
    }

    if (/(方案|解决方案|服务包|治理|项目|交付)/.test(rawText)) {
      return {
        value: "SOLUTION_QUOTE",
        confidence: "medium",
        source: "rule",
        reason: "命中了方案型关键词，推荐方案报价模板"
      } satisfies ProductFieldExtraction;
    }

    return {
      value: "PRODUCT_QUOTE",
      confidence: "medium",
      source: "rule",
      reason: "默认推荐产品报价模板"
    } satisfies ProductFieldExtraction;
  }
}
