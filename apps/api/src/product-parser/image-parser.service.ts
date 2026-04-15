import { BadRequestException, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
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
    if (!this.workerPromise) {
      return;
    }

    const worker = await this.workerPromise;
    await worker.terminate();
    this.workerPromise = null;
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
    const worker = await this.getWorker();
    const {
      data: { text }
    } = await worker.recognize(buffer);

    return this.cleanOcrText(text);
  }

  private async getWorker() {
    if (!this.workerPromise) {
      this.workerPromise = createWorker(["chi_sim", "eng"], 1, {
        logger:
          process.env.NODE_ENV === "development"
            ? (message) => {
                if (message.status.includes("recognizing")) {
                  this.logger.debug(`${message.status} ${Math.round(message.progress * 100)}%`);
                }
              }
            : undefined
      });
    }

    return this.workerPromise;
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
