import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException
} from "@nestjs/common";
import { createWorker } from "tesseract.js";
import { CosStorageService } from "../files/cos-storage.service";
import { UploadedImageFile } from "./product-parser.types";

@Injectable()
export class ImageParserService implements OnModuleDestroy {
  private readonly logger = new Logger(ImageParserService.name);
  private workerPromise: ReturnType<typeof createWorker> | null = null;

  constructor(private readonly cosStorageService: CosStorageService) {}

  async extractTextFromFile(file: UploadedImageFile) {
    this.ensureImageFile(file);
    return this.extractTextFromBuffer(file.buffer);
  }

  async extractTextFromUrl(imageUrl: string) {
    const buffer = await this.loadImageBuffer(imageUrl);
    return this.extractTextFromBuffer(buffer);
  }

  async onModuleDestroy() {
    await this.resetWorker();
  }

  private ensureImageFile(file?: UploadedImageFile) {
    if (!file) {
      throw new BadRequestException("请上传图片");
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      throw new BadRequestException("仅支持 jpg / png / webp 图片");
    }

    if (!file.buffer?.length) {
      throw new BadRequestException("图片内容为空");
    }
  }

  private async extractTextFromBuffer(buffer: Buffer) {
    try {
      const worker = await this.getWorker();
      const {
        data: { text }
      } = await worker.recognize(buffer);

      return this.cleanOcrText(text);
    } catch (error) {
      this.logger.error(
        `OCR 解析失败: ${error instanceof Error ? error.message : "未知错误"}`,
        error instanceof Error ? error.stack : undefined
      );
      await this.resetWorker();
      throw new ServiceUnavailableException("图片解析服务暂时不可用，请稍后重试，或先改用文字解析。");
    }
  }

  private async getWorker() {
    if (!this.workerPromise) {
      this.workerPromise = createWorker(["chi_sim", "eng"], 1, {
        logger: (message) => {
          if (process.env.NODE_ENV !== "development") {
            return;
          }

          if (message.status.includes("recognizing")) {
            this.logger.debug(`${message.status} ${Math.round(message.progress * 100)}%`);
          }
        },
        errorHandler: (error) => {
          this.logger.error(`OCR worker 错误: ${String(error)}`);
        }
      }).catch((error) => {
        this.workerPromise = null;
        throw error;
      });
    }

    return this.workerPromise;
  }

  private async resetWorker() {
    if (!this.workerPromise) {
      return;
    }

    const currentWorkerPromise = this.workerPromise;
    this.workerPromise = null;

    const worker = await currentWorkerPromise.catch(() => null);
    if (!worker) {
      return;
    }

    await worker.terminate().catch((error) => {
      this.logger.warn(
        `OCR worker 终止失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    });
  }

  private async loadImageBuffer(imageUrl: string) {
    if (!imageUrl?.trim()) {
      throw new BadRequestException("缺少图片地址");
    }

    if (imageUrl.startsWith("data:image/")) {
      const match = imageUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
      if (!match?.[1]) {
        throw new BadRequestException("图片数据格式不正确");
      }
      return Buffer.from(match[1], "base64");
    }

    const cosBuffer = await this.cosStorageService.getObjectBufferFromUrl(imageUrl);
    if (cosBuffer) {
      return cosBuffer;
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new BadRequestException("无法访问图片地址");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/^image\/(jpeg|jpg|png|webp)/i.test(contentType)) {
      throw new BadRequestException("图片地址不是受支持的图片格式");
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private cleanOcrText(rawText: string) {
    return rawText
      .replace(/\r\n/g, "\n")
      .replace(/[^\S\n]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
}
