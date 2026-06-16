import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import {
  ParseProductMixedDto,
  ParseProductTextDto,
  ProductParseQueueQueryDto,
  ReviewProductParseLogDto,
} from "./dto/product-parser.dto";
import { UploadedImageFile } from "./product-parser.types";
import { ProductParserService } from "./product-parser.service";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("products")
export class ProductParserController {
  constructor(private readonly productParserService: ProductParserService) {}

  @Permissions("page.products.ai_import")
  @Get("parse-queue")
  async listQueue(
    @Query() query: ProductParseQueueQueryDto,
  ) {
    return this.productParserService.listQueue(query);
  }

  @Permissions("page.products.ai_import")
  @Get("parse-queue/:id")
  async getQueueItem(@Param("id") id: string) {
    return this.productParserService.getQueueItem(id);
  }

  @Permissions("action.product.update")
  @Patch("parse-queue/:id/review")
  async reviewQueueItem(
    @Param("id") id: string,
    @Body() dto: ReviewProductParseLogDto,
    @Req() req: RequestWithUser,
  ) {
    return this.productParserService.reviewQueueItem(id, dto, req.user);
  }

  @Permissions("page.products.ai_import")
  @Post("parse-text")
  async parseText(@Body() dto: ParseProductTextDto, @Req() req: RequestWithUser) {
    return this.productParserService.parseText(dto, req.user);
  }

  @Permissions("page.products.ai_import")
  @Post("parse-image")
  @UseInterceptors(
    FileInterceptor("image", {
      limits: {
        fileSize: 5 * 1024 * 1024
      }
    })
  )
  async parseImage(
    @UploadedFile() file?: UploadedImageFile,
    @Body("imageUrl") imageUrl?: string,
    @Req() req?: RequestWithUser
  ) {
    if (!file) {
      throw new BadRequestException("请上传图片");
    }

    return this.productParserService.parseImage(file, req!.user, imageUrl);
  }

  @Permissions("page.products.ai_import")
  @Post("parse-mixed")
  @UseInterceptors(
    FileInterceptor("image", {
      limits: {
        fileSize: 5 * 1024 * 1024
      }
    })
  )
  async parseMixed(
    @UploadedFile() file: UploadedImageFile | undefined,
    @Body() dto: ParseProductMixedDto,
    @Req() req: RequestWithUser
  ) {
    return this.productParserService.parseMixed(dto, req.user, file);
  }
}
