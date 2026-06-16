import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import type { UploadedImageFile } from "../product-parser/product-parser.types";
import { CreateFileFolderDto } from "./dto/create-file-folder.dto";
import { CreateUploadTokenDto } from "./dto/create-upload-token.dto";
import { FileListQueryDto } from "./dto/file-list-query.dto";
import { FilesBatchActionDto } from "./dto/files-batch-action.dto";
import { LocalUploadDto } from "./dto/local-upload.dto";
import { UploadCallbackDto } from "./dto/upload-callback.dto";
import { UpdateFileFolderDto } from "./dto/update-file-folder.dto";
import { UpdateFileRecordDto } from "./dto/update-file-record.dto";
import { FilesService } from "./files.service";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Permissions("page.files.center")
@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  async listLibrary(@Query() query: FileListQueryDto, @Req() req: RequestWithUser) {
    return this.filesService.listLibrary(query, req.user);
  }

  @Post("upload-token")
  async createUploadToken(@Body() dto: CreateUploadTokenDto, @Req() req: RequestWithUser) {
    return this.filesService.createUploadToken(dto, req.user);
  }

  @Post("folders")
  async createFolder(@Body() dto: CreateFileFolderDto, @Req() req: RequestWithUser) {
    return this.filesService.createFolder(dto, req.user);
  }

  @Patch("folders/:id")
  async updateFolder(
    @Param("id") id: string,
    @Body() dto: UpdateFileFolderDto,
    @Req() req: RequestWithUser,
  ) {
    return this.filesService.updateFolder(id, dto, req.user);
  }

  @Delete("folders/:id")
  async deleteFolder(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.filesService.deleteFolder(id, req.user);
  }

  @Post("callback")
  async createFileRecord(@Body() dto: UploadCallbackDto, @Req() req: RequestWithUser) {
    return this.filesService.createFileRecord(dto, req.user);
  }

  @Post("upload-local")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 100 * 1024 * 1024,
      },
    }),
  )
  async uploadLocalFile(
    @UploadedFile() file: UploadedImageFile | undefined,
    @Body() dto: LocalUploadDto,
    @Req() req: RequestWithUser,
  ) {
    return this.filesService.uploadLocalFile(file, dto, req.user);
  }

  @Post("batch")
  async batchAction(@Body() dto: FilesBatchActionDto, @Req() req: RequestWithUser) {
    return this.filesService.batchAction(dto, req.user);
  }

  @Patch(":id")
  async updateFileById(
    @Param("id") id: string,
    @Body() dto: UpdateFileRecordDto,
    @Req() req: RequestWithUser,
  ) {
    return this.filesService.updateFileById(id, dto, req.user);
  }

  @Get(":id")
  async getFileById(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.filesService.getFileById(id, req.user);
  }
}
