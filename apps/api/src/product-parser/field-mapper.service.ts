import { Injectable } from "@nestjs/common";
import {
  PRODUCT_PARSE_FIELDS,
  type ProductParseConflict,
  type ProductParseDraft,
  type ProductParseFieldKey,
  type ProductParseResponse
} from "./product-parser.types";

@Injectable()
export class FieldMapperService {
  merge(options: {
    textDraft?: ProductParseDraft;
    imageDraft?: ProductParseDraft;
    originalText?: string;
    imageText?: string;
  }): ProductParseResponse {
    const { textDraft, imageDraft, originalText, imageText } = options;

    const parsed: ProductParseResponse["parsed"] = {};
    const confidence: ProductParseResponse["confidence"] = {};
    const sources: ProductParseResponse["sources"] = {};
    const reasons: ProductParseResponse["reasons"] = {};
    const conflicts: ProductParseConflict[] = [];

    for (const field of PRODUCT_PARSE_FIELDS) {
      const textField = textDraft?.fields[field];
      const imageField = imageDraft?.fields[field];

      if (!textField && !imageField) {
        continue;
      }

      if (!textField || !imageField) {
        const selected = textField ?? imageField;
        if (!selected) {
          continue;
        }
        parsed[field] = selected.value;
        confidence[field] = selected.confidence;
        sources[field] = selected.source;
        reasons[field] = selected.reason;
        continue;
      }

      if (this.normalizeValue(textField.value) === this.normalizeValue(imageField.value)) {
        const preferred = textField.value.length >= imageField.value.length ? textField : imageField;
        parsed[field] = preferred.value;
        confidence[field] = this.maxConfidence(textField.confidence, imageField.confidence);
        sources[field] = "mixed";
        reasons[field] = `文本与图片结果一致；${preferred.reason}`;
        continue;
      }

      const preferred = this.pickPreferred(textField, imageField);
      parsed[field] = preferred.value;
      confidence[field] = preferred.confidence;
      sources[field] = preferred.source;
      reasons[field] = `检测到图文冲突，默认展示${preferred.source === "text" ? "文本" : "图片"}结果，需人工确认`;
      conflicts.push({
        field,
        preferredValue: preferred.value,
        candidates: [textField, imageField]
      });
    }

    const combinedRawText = [originalText?.trim(), imageText?.trim()].filter(Boolean).join("\n\n");

    return {
      rawText: combinedRawText,
      originalText: originalText?.trim(),
      imageText: imageText?.trim(),
      parsed,
      confidence,
      sources,
      reasons,
      conflicts
    };
  }

  private normalizeValue(value: string) {
    return value.replace(/\s+/g, "").toLowerCase();
  }

  private pickPreferred<T extends { confidence: string; value: string }>(left: T, right: T) {
    const leftScore = this.confidenceScore(left.confidence);
    const rightScore = this.confidenceScore(right.confidence);

    if (leftScore !== rightScore) {
      return leftScore > rightScore ? left : right;
    }

    return left.value.length >= right.value.length ? left : right;
  }

  private maxConfidence(left: string, right: string) {
    return this.confidenceScore(left) >= this.confidenceScore(right)
      ? (left as ProductParseResponse["confidence"][ProductParseFieldKey])
      : (right as ProductParseResponse["confidence"][ProductParseFieldKey]);
  }

  private confidenceScore(value: string) {
    if (value === "high") return 3;
    if (value === "medium") return 2;
    return 1;
  }
}
