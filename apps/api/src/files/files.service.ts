import { Injectable, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CosStorageService } from "./cos-storage.service";
import { CreateUploadTokenDto } from "./dto/create-upload-token.dto";
import { UploadCallbackDto } from "./dto/upload-callback.dto";

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cosStorageService: CosStorageService
  ) {}

  createUploadToken(dto: CreateUploadTokenDto) {
    return this.cosStorageService.createUploadToken(dto);
  }

  async createFileRecord(dto: UploadCallbackDto, user: AuthenticatedUser) {
    const file = await this.prisma.fileRecord.create({
      data: {
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        fileType: dto.fileType,
        businessType: dto.businessType,
        businessId: dto.businessId,
        uploaderUserId: user.id
      }
    });

    return file;
  }

  async getFileById(id: string) {
    const file = await this.prisma.fileRecord.findUnique({
      where: { id }
    });

    if (!file) {
      throw new NotFoundException("文件不存在");
    }

    return file;
  }
}
