import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { CreateUploadTokenDto } from "./dto/create-upload-token.dto";
import { UploadCallbackDto } from "./dto/upload-callback.dto";
import { FilesService } from "./files.service";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("upload-token")
  async createUploadToken(@Body() dto: CreateUploadTokenDto) {
    return this.filesService.createUploadToken(dto);
  }

  @Post("callback")
  async createFileRecord(@Body() dto: UploadCallbackDto, @Req() req: RequestWithUser) {
    return this.filesService.createFileRecord(dto, req.user);
  }

  @Get(":id")
  async getFileById(@Param("id") id: string) {
    return this.filesService.getFileById(id);
  }
}
