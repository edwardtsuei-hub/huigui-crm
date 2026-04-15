export const PRICE_PER_BUCKET = 2100;
export const BUCKET_KG = 10;

export const cropCatalog = [
  { keywords: ["棉花", "cotton"], type: "cotton", cycleDays: 160, cycleLabel: "约150~180天" },
  { keywords: ["柑橘", "橘", "橙", "柚", "柠檬"], type: "fruit", cycleDays: 180, cycleLabel: "约180天" },
  { keywords: ["苹果"], type: "fruit", cycleDays: 160, cycleLabel: "约160天" },
  { keywords: ["梨"], type: "fruit", cycleDays: 165, cycleLabel: "约165天" },
  { keywords: ["葡萄"], type: "fruit", cycleDays: 150, cycleLabel: "约150天" },
  { keywords: ["桃", "李", "樱桃"], type: "fruit", cycleDays: 150, cycleLabel: "约150天" },
  { keywords: ["草莓"], type: "fruit", cycleDays: 65, cycleLabel: "约65天" },
  { keywords: ["蓝莓", "芒果", "香蕉", "荔枝", "龙眼", "榴莲"], type: "fruit", cycleDays: 180, cycleLabel: "约180天" },
  { keywords: ["芦笋"], type: "asparagus", cycleDays: 120, cycleLabel: "约120天" },
  { keywords: ["萝卜"], type: "root_other", cycleDays: 55, cycleLabel: "约50~60天" },
  { keywords: ["胡萝卜"], type: "root_other", cycleDays: 65, cycleLabel: "约50~75天" },
  { keywords: ["甜菜", "红菜头"], type: "root_other", cycleDays: 55, cycleLabel: "约50~60天" },
  { keywords: ["马铃薯", "土豆"], type: "root_other", cycleDays: 95, cycleLabel: "约90~100天" },
  { keywords: ["红薯", "甘薯"], type: "root_other", cycleDays: 120, cycleLabel: "约100~120天" },
  { keywords: ["山药", "芋头", "姜", "蒜", "洋葱"], type: "root_other", cycleDays: 110, cycleLabel: "约90~120天" },
  { keywords: ["生菜", "油麦菜"], type: "leafy", cycleDays: 50, cycleLabel: "约40~60天" },
  { keywords: ["菠菜"], type: "leafy", cycleDays: 40, cycleLabel: "约35~45天" },
  { keywords: ["小白菜", "上海青", "青江菜"], type: "leafy", cycleDays: 45, cycleLabel: "约40~50天" },
  { keywords: ["茼蒿", "香菜", "芹菜"], type: "leafy", cycleDays: 50, cycleLabel: "约45~60天" },
  { keywords: ["羽衣甘蓝", "甘蓝", "卷心菜", "包菜"], type: "leafy", cycleDays: 75, cycleLabel: "约50~100天" },
  { keywords: ["莴笋"], type: "leafy", cycleDays: 70, cycleLabel: "约60~80天" },
  { keywords: ["芥菜"], type: "leafy", cycleDays: 35, cycleLabel: "约30~40天" },
  { keywords: ["小葱", "香葱", "青葱", "绿葱"], type: "leafy", cycleDays: 65, cycleLabel: "约60~70天" },
  { keywords: ["西兰花", "菜花", "花菜"], type: "leafy", cycleDays: 65, cycleLabel: "约50~80天" },
  { keywords: ["番茄", "西红柿"], type: "melon", cycleDays: 75, cycleLabel: "约65~90天" },
  { keywords: ["黄瓜"], type: "melon", cycleDays: 55, cycleLabel: "约50~60天" },
  { keywords: ["丝瓜", "苦瓜"], type: "melon", cycleDays: 70, cycleLabel: "约60~80天" },
  { keywords: ["南瓜", "冬瓜"], type: "melon", cycleDays: 100, cycleLabel: "约90~110天" },
  { keywords: ["西瓜", "甜瓜", "哈密瓜", "香瓜"], type: "melon", cycleDays: 78, cycleLabel: "约70~85天" },
  { keywords: ["茄子"], type: "melon", cycleDays: 60, cycleLabel: "约50~70天" },
  { keywords: ["辣椒", "彩椒", "甜椒"], type: "melon", cycleDays: 85, cycleLabel: "约75~95天" },
  { keywords: ["四季豆", "芸豆", "菜豆", "豇豆", "豌豆"], type: "melon", cycleDays: 60, cycleLabel: "约45~80天" },
  { keywords: ["水稻", "稻米"], type: "grain", cycleDays: 120, cycleLabel: "约100~130天" },
  { keywords: ["小麦"], type: "grain", cycleDays: 120, cycleLabel: "约110~130天" },
  { keywords: ["玉米", "甜玉米"], type: "grain", cycleDays: 80, cycleLabel: "约60~100天" },
  { keywords: ["高粱", "谷子", "大麦"], type: "grain", cycleDays: 120, cycleLabel: "约100~130天" },
  { keywords: ["黄豆", "大豆"], type: "seeds", cycleDays: 110, cycleLabel: "约100~120天" },
  { keywords: ["绿豆", "红豆", "黑豆"], type: "seeds", cycleDays: 100, cycleLabel: "约90~110天" },
  { keywords: ["芝麻", "花生", "葵花", "油菜籽"], type: "seeds", cycleDays: 120, cycleLabel: "约100~130天" },
  { keywords: ["玫瑰", "菊花", "百合", "兰花", "康乃馨", "向日葵", "满天星"], type: "flowers", cycleDays: 100, cycleLabel: "约90~120天" },
  { keywords: ["茶", "茶叶", "薄荷", "迷迭香", "百里香", "罗勒", "薰衣草", "艾草", "金银花", "鱼腥草"], type: "herbs", cycleDays: 120, cycleLabel: "约90~120天" },
  { keywords: ["芽菜", "豆芽", "苜蓿芽", "豌豆苗芽"], type: "sprouts", cycleDays: 10, cycleLabel: "约7~10天" }
] as const;

type StageKey = "initial" | "maintenance";

type ProductRule = {
  initial: { kgPerMu: number; dilution: string; waterLPerMu: number };
  maintenance: { kgPerMu: number; dilution: string; waterLPerMu: number };
};

type CyclePlanItem = {
  step: string;
  time: string;
  product: "GA" | "GB" | "GC";
  times: number;
  note: string;
};

type CropRule = {
  label: string;
  ga: ProductRule | null;
  gb: ProductRule | null;
  cyclePlan: Record<StageKey, CyclePlanItem[]>;
  notes: string[];
};

export const cropRules: Record<string, CropRule> = {
  cotton: {
    label: "棉花",
    ga: {
      initial: { kgPerMu: 3.45, dilution: "200倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 1.03, dilution: "200倍", waterLPerMu: 300 }
    },
    gb: {
      initial: { kgPerMu: 3.45, dilution: "200倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 1.03, dilution: "200倍", waterLPerMu: 300 }
    },
    cyclePlan: {
      initial: [
        { step: "第1次", time: "翻土 / 播种前", product: "GA", times: 1, note: "喷土后再耕耘，完成土壤启动" },
        { step: "第2次", time: "苗期建立后", product: "GB", times: 1, note: "第一次叶面喷施" },
        { step: "第3次", time: "现蕾期", product: "GB", times: 1, note: "促进中期营养管理" },
        { step: "第4次", time: "开花结铃期", product: "GB", times: 1, note: "关键生育期喷施" },
        { step: "第5次", time: "吐絮前约10天", product: "GB", times: 1, note: "采收前管理" }
      ],
      maintenance: [
        { step: "第1次", time: "每1~2个月1次", product: "GA", times: 1, note: "土壤维持管理" },
        { step: "第2次", time: "苗期 / 现蕾期 / 开花结铃期 / 吐絮前", product: "GB", times: 4, note: "按关键生育节点管理" }
      ]
    },
    notes: ["播种前先做土壤喷施再整地", "苗期、现蕾期、开花结铃期、吐絮前为关键喷施节点", "高温时段避免喷施", "前2个月内原则上不再施肥"]
  },
  fruit: {
    label: "果树类",
    ga: {
      initial: { kgPerMu: 3.45, dilution: "200倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 1.03, dilution: "200倍", waterLPerMu: 300 }
    },
    gb: {
      initial: { kgPerMu: 3.45, dilution: "200倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 1.03, dilution: "200倍", waterLPerMu: 300 }
    },
    cyclePlan: {
      initial: [
        { step: "第1次", time: "建园翻土时 / 旧园启动时", product: "GA", times: 1, note: "喷土壤，重点覆盖根域" },
        { step: "第2次", time: "第1个月内，每15天1次，共2次", product: "GB", times: 2, note: "喷枝叶与叶背，由下往上喷" },
        { step: "第3次", time: "长新芽时", product: "GB", times: 1, note: "喷新梢与叶背" },
        { step: "第4次", time: "结果时", product: "GB", times: 1, note: "全株均匀喷洒" },
        { step: "第5次", time: "收成前10天", product: "GB", times: 1, note: "帮助成熟期管理" },
        { step: "第6次", time: "收成后", product: "GB", times: 1, note: "恢复树势；开花时勿直接喷花" }
      ],
      maintenance: [
        { step: "第1次", time: "每1~2个月1次", product: "GA", times: 1, note: "视土壤状态喷施土壤" },
        { step: "第2次", time: "平时每15天1次", product: "GB", times: 2, note: "叶面维持管理，可持续执行" },
        { step: "第3次", time: "结果时 / 收成前10天 / 收成后", product: "GB", times: 3, note: "关键节点加强" }
      ]
    },
    notes: ["新果园于翻土时喷洒", "旧果园喷洒于果园土地或树根周围", "修整枝叶后喷叶背，由下往上喷", "开花时不要直接喷在花上", "前2个月内不需施肥"]
  },
  asparagus: {
    label: "根茎类（芦笋）",
    ga: {
      initial: { kgPerMu: 3.45, dilution: "200倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 1.03, dilution: "200倍", waterLPerMu: 300 }
    },
    gb: {
      initial: { kgPerMu: 2.28, dilution: "300倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 0.69, dilution: "300倍", waterLPerMu: 300 }
    },
    cyclePlan: {
      initial: [
        { step: "第1次", time: "播种 / 定植前", product: "GA", times: 1, note: "先喷土壤，再翻土耕耘" },
        { step: "第2次", time: "第1个月内，每15天1次，共2次", product: "GB", times: 2, note: "芦笋按300倍稀释叶喷" },
        { step: "第3次", time: "收成前10天", product: "GB", times: 1, note: "收成前管理" }
      ],
      maintenance: [
        { step: "第1次", time: "每1~2个月1次", product: "GA", times: 1, note: "视土壤状况使用" },
        { step: "第2次", time: "平时每10~15天1次", product: "GB", times: 2, note: "叶面维持管理" }
      ]
    },
    notes: ["耕耘前喷洒在土壤中", "喷洒后翻土耕耘", "前2个月内不需施肥"]
  },
  root_other: {
    label: "根茎类（其他）",
    ga: {
      initial: { kgPerMu: 3.45, dilution: "200倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 1.03, dilution: "200倍", waterLPerMu: 300 }
    },
    gb: {
      initial: { kgPerMu: 1.72, dilution: "400倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 0.52, dilution: "400倍", waterLPerMu: 300 }
    },
    cyclePlan: {
      initial: [
        { step: "第1次", time: "播种 / 定植前", product: "GA", times: 1, note: "先喷土壤，再翻土耕耘" },
        { step: "第2次", time: "第1个月内，每15天1次，共2次", product: "GB", times: 2, note: "叶面均匀喷施" },
        { step: "第3次", time: "收成前10天", product: "GB", times: 1, note: "收成前管理" }
      ],
      maintenance: [
        { step: "第1次", time: "每1~2个月1次", product: "GA", times: 1, note: "视土壤状况使用" },
        { step: "第2次", time: "平时每10~15天1次", product: "GB", times: 2, note: "叶面维持管理" }
      ]
    },
    notes: ["耕耘前喷洒在土壤中", "喷洒后翻土耕耘", "前2个月内不需施肥"]
  },
  leafy: {
    label: "叶菜类",
    ga: {
      initial: { kgPerMu: 3.45, dilution: "200倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 1.03, dilution: "200倍", waterLPerMu: 300 }
    },
    gb: {
      initial: { kgPerMu: 1.72, dilution: "400倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 0.52, dilution: "400倍", waterLPerMu: 300 }
    },
    cyclePlan: {
      initial: [
        { step: "第1次", time: "播种前", product: "GA", times: 1, note: "喷土壤后覆土再播种" },
        { step: "第2次", time: "本叶2~3叶期起，首月每10天1次，共3次", product: "GB", times: 3, note: "全株叶面均匀喷施" },
        { step: "第3次", time: "收成前5天", product: "GB", times: 1, note: "收成前管理" }
      ],
      maintenance: [
        { step: "第1次", time: "每1~2个月1次", product: "GA", times: 1, note: "视土壤状态使用" },
        { step: "第2次", time: "平时每10天1次", product: "GB", times: 3, note: "持续叶面管理" }
      ]
    },
    notes: ["播种前喷洒在土壤中", "喷洒后覆土再播种", "生育初期本叶2~3叶期起喷第1次", "收成前5天喷1次", "前2个月内不需施肥"]
  },
  melon: {
    label: "瓜果类",
    ga: {
      initial: { kgPerMu: 3.45, dilution: "200倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 1.03, dilution: "200倍", waterLPerMu: 300 }
    },
    gb: {
      initial: { kgPerMu: 3.45, dilution: "200倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 1.03, dilution: "200倍", waterLPerMu: 300 }
    },
    cyclePlan: {
      initial: [
        { step: "第1次", time: "翻土 / 定植前", product: "GA", times: 1, note: "喷土后再耕耘" },
        { step: "第2次", time: "幼苗期开始，首月每15天1次，共2次", product: "GB", times: 2, note: "喷叶面与叶背" },
        { step: "第3次", time: "收成前10天", product: "GB", times: 1, note: "关键期管理" }
      ],
      maintenance: [
        { step: "第1次", time: "每1~2个月1次", product: "GA", times: 1, note: "土壤维持管理" },
        { step: "第2次", time: "平时每10~15天1次", product: "GB", times: 2, note: "叶面维持管理" }
      ]
    },
    notes: ["翻土时直接喷洒土壤中，不翻土也可用", "喷洒后再耕耘", "幼苗喷洒第1次", "收成前10天喷1次", "前2个月内不需施肥"]
  },
  grain: {
    label: "谷类",
    ga: {
      initial: { kgPerMu: 3.45, dilution: "200倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 1.03, dilution: "200倍", waterLPerMu: 300 }
    },
    gb: {
      initial: { kgPerMu: 3.45, dilution: "200倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 1.03, dilution: "200倍", waterLPerMu: 300 }
    },
    cyclePlan: {
      initial: [
        { step: "第1次", time: "翻土前", product: "GA", times: 1, note: "先做土壤改善" },
        { step: "第2次", time: "插秧后7天", product: "GB", times: 1, note: "第一次叶面喷施" },
        { step: "第3次", time: "受粉后", product: "GB", times: 1, note: "关键生育期喷施" },
        { step: "第4次", time: "开花后", product: "GB", times: 1, note: "关键生育期喷施" },
        { step: "第5次", time: "收成前10天", product: "GB", times: 1, note: "收成前管理" }
      ],
      maintenance: [
        { step: "第1次", time: "每1~2个月1次", product: "GA", times: 1, note: "土壤维持管理" },
        { step: "第2次", time: "关键节点4次", product: "GB", times: 4, note: "插秧后7天、受粉后、开花后、收成前10天" }
      ]
    },
    notes: ["翻土前使用GA", "插秧后7天第1次GB", "稻米受粉后喷洒1次", "开花后喷洒1次", "收成前10天喷洒1次", "前2个月内不需施肥"]
  },
  seeds: {
    label: "种子类",
    ga: {
      initial: { kgPerMu: 3.45, dilution: "200倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 1.03, dilution: "200倍", waterLPerMu: 300 }
    },
    gb: {
      initial: { kgPerMu: 3.45, dilution: "200倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 1.03, dilution: "200倍", waterLPerMu: 300 }
    },
    cyclePlan: {
      initial: [
        { step: "第1次", time: "翻土时", product: "GA", times: 1, note: "喷土后再耕耘" },
        { step: "第2次", time: "首月每15天1次，共2次", product: "GB", times: 2, note: "叶面均匀喷施" },
        { step: "第3次", time: "收成前7天", product: "GB", times: 1, note: "收成前管理" },
        { step: "第4次", time: "收成后立即", product: "GB", times: 1, note: "喷于叶面及伤口上" }
      ],
      maintenance: [
        { step: "第1次", time: "每1~2个月1次", product: "GA", times: 1, note: "土壤维持管理" },
        { step: "第2次", time: "平时每10~15天1次", product: "GB", times: 2, note: "叶面维持管理" }
      ]
    },
    notes: ["翻土时直接喷洒土壤中，不翻土也可使用", "喷洒后再耕耘", "收成前7天喷1次", "收成后立即喷于叶面及伤口上", "前2个月内不需施肥"]
  },
  flowers: {
    label: "花卉类",
    ga: {
      initial: { kgPerMu: 3.45, dilution: "200倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 1.03, dilution: "200倍", waterLPerMu: 300 }
    },
    gb: {
      initial: { kgPerMu: 2.28, dilution: "300倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 0.69, dilution: "300倍", waterLPerMu: 300 }
    },
    cyclePlan: {
      initial: [
        { step: "第1次", time: "翻土 / 定植前", product: "GA", times: 1, note: "喷土后再耕耘" },
        { step: "第2次", time: "幼苗期开始，首月每15天1次，共2次", product: "GB", times: 2, note: "喷叶面与叶背" },
        { step: "第3次", time: "收成前10天", product: "GB", times: 1, note: "关键期管理" }
      ],
      maintenance: [
        { step: "第1次", time: "每1~2个月1次", product: "GA", times: 1, note: "土壤维持管理" },
        { step: "第2次", time: "平时每10~15天1次", product: "GB", times: 2, note: "叶面维持管理" }
      ]
    },
    notes: ["翻土时直接喷洒土壤中，不翻土也可使用", "喷洒后再耕耘", "幼苗喷洒第1次", "收成前10天喷1次", "前2个月内不需施肥"]
  },
  herbs: {
    label: "药用及辛香植物 / 茶叶 / 灌木及其他类",
    ga: {
      initial: { kgPerMu: 3.45, dilution: "200倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 1.03, dilution: "200倍", waterLPerMu: 300 }
    },
    gb: {
      initial: { kgPerMu: 3.45, dilution: "200倍", waterLPerMu: 1000 },
      maintenance: { kgPerMu: 1.03, dilution: "200倍", waterLPerMu: 300 }
    },
    cyclePlan: {
      initial: [
        { step: "第1次", time: "启动时", product: "GA", times: 1, note: "直接土壤喷施" },
        { step: "第2次", time: "首月", product: "GB", times: 1, note: "叶面喷施1次" },
        { step: "第3次", time: "收成前7天", product: "GB", times: 1, note: "关键期管理" },
        { step: "第4次", time: "收成后立即", product: "GB", times: 1, note: "喷于叶面及伤口上" }
      ],
      maintenance: [
        { step: "第1次", time: "每1~2个月1次", product: "GA", times: 1, note: "土壤维持管理" },
        { step: "第2次", time: "平时每1个月1次", product: "GB", times: 1, note: "叶面维持管理" }
      ]
    },
    notes: ["可直接使用", "收成前7天喷1次", "收成后立即喷于叶面及伤口上", "前2个月内不需施肥"]
  },
  sprouts: {
    label: "芽菜类",
    ga: null,
    gb: null,
    cyclePlan: {
      initial: [{ step: "第1次", time: "培育前", product: "GC", times: 1, note: "种子沁种30秒" }],
      maintenance: [{ step: "第1次", time: "每批次育芽前", product: "GC", times: 1, note: "种子沁种30秒" }]
    },
    notes: ["芽菜类无需使用GA", "芽菜类无需使用GB", "仅建议使用GC进行沁种"]
  }
};

export type CropTypeKey = keyof typeof cropRules;
export type DiscountType = "percentage" | "perBucket";

export type AgricultureCropInput = {
  cropName: string;
  manualCropType?: CropTypeKey;
  areaMu: number;
  startDate?: string;
  actualCycleDays?: number;
  stage: StageKey;
  isOrganic: boolean;
  needGC: boolean;
  gcWaterLiters: number;
};

export type AgriculturePreviewInput = {
  planName: string;
  discountType: DiscountType;
  discountValue: number;
  discountReason?: string;
  remark?: string;
  crops: AgricultureCropInput[];
};

function fmtNumber(value: number) {
  return Number(value.toFixed(2));
}

function addDays(dateStr: string | undefined, days: number) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function ceilBuckets(kg: number) {
  return Math.ceil((kg || 0) / BUCKET_KG);
}

function stageCycleDays(type: CropTypeKey) {
  const map: Record<CropTypeKey, number> = {
    cotton: 160,
    fruit: 180,
    asparagus: 120,
    root_other: 110,
    leafy: 90,
    melon: 120,
    grain: 120,
    seeds: 120,
    flowers: 100,
    herbs: 120,
    sprouts: 10
  };
  return map[type] ?? 90;
}

function stageCycleLabel(type: CropTypeKey) {
  const map: Record<CropTypeKey, string> = {
    cotton: "约150~180天",
    fruit: "约180天",
    asparagus: "约120天",
    root_other: "约90~120天",
    leafy: "约60~90天",
    melon: "约90~120天",
    grain: "约100~130天",
    seeds: "约100~130天",
    flowers: "约90~120天",
    herbs: "约90~120天",
    sprouts: "约7~10天"
  };
  return map[type] ?? "待选择";
}

function discountedBucketPrice(discountType: DiscountType, discountValue: number) {
  if (discountType === "percentage") {
    return fmtNumber(PRICE_PER_BUCKET * (1 - discountValue / 100));
  }
  return Math.max(0, fmtNumber(PRICE_PER_BUCKET - discountValue));
}

export function inferCropType(name: string) {
  const text = String(name || "").trim().toLowerCase();
  if (!text) {
    return { type: null, matched: false, cycleDays: null, cycleLabel: "待选择", matchedKeyword: null };
  }

  for (const item of cropCatalog) {
    for (const keyword of item.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return {
          type: item.type as CropTypeKey,
          matched: true,
          matchedKeyword: keyword,
          cycleDays: item.cycleDays,
          cycleLabel: item.cycleLabel
        };
      }
    }
  }

  return { type: null, matched: false, cycleDays: null, cycleLabel: "待选择", matchedKeyword: null };
}

export function buildCycleRows(rule: CropRule, stage: StageKey, area: number, isOrganic: boolean) {
  const rows = rule.cyclePlan[stage] ?? [];
  const expanded: Array<{
    step: string;
    time: string;
    product: "GA" | "GB" | "GC";
    note: string;
    occurrence: number;
    totalOccurrences: number;
    kgPerMu: number | null;
    waterLPerMu: number | null;
    totalKg: number | null;
    totalWaterL: number | null;
    dilution: string;
    tutorial: string;
  }> = [];
  let globalApplicationIndex = 0;

  rows.forEach((row) => {
    const repeat = row.times || 1;

    if (row.product === "GC") {
      expanded.push({
        ...row,
        occurrence: 1,
        totalOccurrences: repeat,
        kgPerMu: null,
        waterLPerMu: null,
        totalKg: null,
        totalWaterL: null,
        dilution: "500倍",
        tutorial: row.note
      });
      return;
    }

    const source = rule[row.product.toLowerCase() as "ga" | "gb"]?.[stage];
    if (!source) {
      return;
    }

    for (let repeatIndex = 1; repeatIndex <= repeat; repeatIndex += 1) {
      globalApplicationIndex += 1;
      let multiplier = 1;
      if (isOrganic) {
        multiplier = 0.5;
      } else if (globalApplicationIndex >= 2) {
        multiplier = 0.5;
      }

      const kgPerMu = source.kgPerMu * multiplier;
      const totalKg = kgPerMu * area;
      const totalWaterL = source.waterLPerMu * area;

      expanded.push({
        ...row,
        step: repeat > 1 ? `${row.step}-${repeatIndex}` : row.step,
        occurrence: repeatIndex,
        totalOccurrences: repeat,
        kgPerMu,
        waterLPerMu: source.waterLPerMu,
        dilution: source.dilution,
        totalKg,
        totalWaterL,
        tutorial: `${row.product}按 ${kgPerMu.toFixed(2)}kg/亩/次，稀释${source.dilution}，每亩约兑水${source.waterLPerMu.toFixed(
          2
        )}L，${row.note}${repeat > 1 ? `（第${repeatIndex}次）` : ""}`
      });
    }
  });

  return expanded;
}

function scheduleOffsets(type: CropTypeKey, cycleDays: number, index: number, total: number) {
  let offset = index === 0 ? 0 : Math.round((index / Math.max(total - 1, 1)) * cycleDays);
  const presets: Partial<Record<CropTypeKey, number[]>> = {
    leafy: [0, 10, 20, Math.max(cycleDays - 5, 0)],
    melon: [0, 15, 30, Math.max(cycleDays - 10, 0)],
    grain: [0, 7, Math.round(cycleDays * 0.45), Math.round(cycleDays * 0.65), Math.max(cycleDays - 10, 0)],
    fruit: [0, 15, 30, 45, Math.round(cycleDays * 0.65), Math.max(cycleDays - 10, 0), cycleDays],
    cotton: [0, 30, 60, 100, Math.max(cycleDays - 10, 0)]
  };
  return presets[type]?.[index] ?? offset;
}

export function previewAgriculturePlan(input: AgriculturePreviewInput) {
  const priceAfterDiscount = discountedBucketPrice(input.discountType, input.discountValue);

  const crops = input.crops.map((crop) => {
    const inferred = inferCropType(crop.cropName);
    const cropType = (inferred.matched ? inferred.type : crop.manualCropType) as CropTypeKey | undefined;
    const unresolved = !cropType;

    if (unresolved) {
      return {
        cropName: crop.cropName,
        unresolved: true,
        autoMatched: false,
        matchedKeyword: null,
        cropType: null,
        cropLabel: "待选择",
        cycleDays: crop.actualCycleDays || null,
        cycleLabel: "待选择",
        startDate: crop.startDate,
        estimatedHarvestDate: "",
        stage: crop.stage,
        isOrganic: crop.isOrganic,
        needGC: crop.needGC,
        gcWaterLiters: crop.gcWaterLiters,
        scheduleRows: [],
        gaCycleKg: 0,
        gbCycleKg: 0,
        gcKg: 0,
        gaBuckets: 0,
        gbBuckets: 0,
        gcBuckets: 0,
        totalBuckets: 0,
        originalAmount: 0,
        discountedAmount: 0,
        notes: ["未自动命中作物，请手动选择类别后再生成正式报价。"],
        quoteLines: []
      };
    }

    const rule = cropRules[cropType];
    const cycleDays = Number(crop.actualCycleDays) || inferred.cycleDays || stageCycleDays(cropType);
    const cycleLabel = `约${cycleDays}天`;
    const estimatedHarvestDate = crop.startDate ? addDays(crop.startDate, cycleDays) : "";
    const scheduleRows = buildCycleRows(rule, crop.stage, Number(crop.areaMu || 0), crop.isOrganic).map(
      (row, index, rows) => ({
        ...row,
        estimatedDate: crop.startDate ? addDays(crop.startDate, scheduleOffsets(cropType, cycleDays, index, rows.length)) : ""
      })
    );

    const gaCycleKg = fmtNumber(scheduleRows.filter((row) => row.product === "GA").reduce((sum, row) => sum + (row.totalKg || 0), 0));
    const gbCycleKg = fmtNumber(scheduleRows.filter((row) => row.product === "GB").reduce((sum, row) => sum + (row.totalKg || 0), 0));
    const gcKg = crop.needGC ? fmtNumber(Number(crop.gcWaterLiters || 0) / 500) : 0;

    const gaBuckets = ceilBuckets(gaCycleKg);
    const gbBuckets = ceilBuckets(gbCycleKg);
    const gcBuckets = crop.needGC ? ceilBuckets(gcKg) : 0;
    const totalBuckets = gaBuckets + gbBuckets + gcBuckets;
    const originalAmount = totalBuckets * PRICE_PER_BUCKET;
    const discountedAmount = fmtNumber(totalBuckets * priceAfterDiscount);

    const quoteLines = [
      ...(gaBuckets > 0
        ? [
            {
              productCode: "GA",
              displayName: `${crop.cropName || rule.label} - GA`,
              specification: `${rule.label} ${crop.stage === "initial" ? "首次使用" : "改善后"}`,
              bucketCount: gaBuckets,
              totalKg: gaCycleKg,
              lineTotal: fmtNumber(gaBuckets * priceAfterDiscount),
              note: `GA 总用量 ${gaCycleKg}kg，折算 ${gaBuckets} 桶`
            }
          ]
        : []),
      ...(gbBuckets > 0
        ? [
            {
              productCode: "GB",
              displayName: `${crop.cropName || rule.label} - GB`,
              specification: `${rule.label} ${crop.stage === "initial" ? "首次使用" : "改善后"}`,
              bucketCount: gbBuckets,
              totalKg: gbCycleKg,
              lineTotal: fmtNumber(gbBuckets * priceAfterDiscount),
              note: `GB 总用量 ${gbCycleKg}kg，折算 ${gbBuckets} 桶`
            }
          ]
        : []),
      ...(gcBuckets > 0
        ? [
            {
              productCode: "GC",
              displayName: `${crop.cropName || rule.label} - GC`,
              specification: `GC 沁种方案`,
              bucketCount: gcBuckets,
              totalKg: gcKg,
              lineTotal: fmtNumber(gcBuckets * priceAfterDiscount),
              note: `GC 总用量 ${gcKg}kg，折算 ${gcBuckets} 桶`
            }
          ]
        : [])
    ];

    return {
      cropName: crop.cropName || rule.label,
      unresolved: false,
      autoMatched: inferred.matched,
      matchedKeyword: inferred.matchedKeyword,
      cropType,
      cropLabel: rule.label,
      cycleDays,
      cycleLabel,
      startDate: crop.startDate,
      estimatedHarvestDate,
      stage: crop.stage,
      isOrganic: crop.isOrganic,
      needGC: crop.needGC,
      gcWaterLiters: crop.gcWaterLiters,
      scheduleRows,
      gaCycleKg,
      gbCycleKg,
      gcKg,
      gaBuckets,
      gbBuckets,
      gcBuckets,
      totalBuckets,
      originalAmount,
      discountedAmount,
      notes: rule.notes,
      quoteLines
    };
  });

  const unresolvedCount = crops.filter((crop) => crop.unresolved).length;
  const gaKg = fmtNumber(crops.reduce((sum, crop) => sum + crop.gaCycleKg, 0));
  const gbKg = fmtNumber(crops.reduce((sum, crop) => sum + crop.gbCycleKg, 0));
  const gcKg = fmtNumber(crops.reduce((sum, crop) => sum + crop.gcKg, 0));
  const gaBuckets = crops.reduce((sum, crop) => sum + crop.gaBuckets, 0);
  const gbBuckets = crops.reduce((sum, crop) => sum + crop.gbBuckets, 0);
  const gcBuckets = crops.reduce((sum, crop) => sum + crop.gcBuckets, 0);
  const totalBuckets = gaBuckets + gbBuckets + gcBuckets;
  const totalOriginal = totalBuckets * PRICE_PER_BUCKET;
  const totalDiscounted = fmtNumber(totalBuckets * priceAfterDiscount);
  const quoteItems = crops.flatMap((crop) => crop.quoteLines);

  return {
    planName: input.planName,
    discountType: input.discountType,
    discountValue: input.discountValue,
    discountReason: input.discountReason ?? "",
    remark: input.remark ?? "",
    perBucketPrice: priceAfterDiscount,
    unresolvedCount,
    totals: {
      gaKg,
      gbKg,
      gcKg,
      gaBuckets,
      gbBuckets,
      gcBuckets,
      totalBuckets,
      totalOriginal,
      totalDiscounted
    },
    crops,
    notes: [
      "常规农场：第一次按标准量，第一次以后所有使用量都减半。",
      "有机农场：从第一次开始全部按减半使用。",
      "未命中作物时，请手动选择类别并校正实际种植天数。",
      "各作物的种植天数已预置常见估算值，客户若实际周期不同，可直接编辑。",
      "本说明书为种植建议版，实际节奏可依据当地气候、品种、生长势与田间管理方式做微调。"
    ],
    quoteItems,
    documentSections: [
      {
        title: "方案概述",
        body: `本方案共覆盖 ${crops.length} 个作物，原价合计 ¥${totalOriginal.toFixed(2)}，优惠后合计 ¥${totalDiscounted.toFixed(
          2
        )}。`
      },
      {
        title: "用量汇总",
        body: `GA ${gaKg}kg / ${gaBuckets}桶，GB ${gbKg}kg / ${gbBuckets}桶，GC ${gcKg}kg / ${gcBuckets}桶，总采购量 ${totalBuckets}桶。`
      },
      {
        title: "优惠说明",
        body:
          input.discountType === "percentage"
            ? `统一优惠比例 ${input.discountValue}%${input.discountReason ? `，原因：${input.discountReason}` : ""}`
            : `统一每桶优惠 ${input.discountValue} 元${input.discountReason ? `，原因：${input.discountReason}` : ""}`
      },
      {
        title: "作物摘要",
        body: crops
          .map(
            (crop) =>
              `${crop.cropName}｜${crop.cropLabel}｜${crop.cycleLabel}｜${crop.totalBuckets}桶｜¥${crop.discountedAmount.toFixed(2)}`
          )
          .join("\n")
      }
    ]
  };
}
