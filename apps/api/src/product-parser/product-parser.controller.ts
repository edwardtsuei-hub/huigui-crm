import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { ParseProductMixedDto, ParseProductTextDto } from "./dto/product-parser.dto";
import { UploadedImageFile } from "./product-parser.types";
import { ProductParserService } from "./product-parser.service";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("products")
export class ProductParserController {
  constructor(private readonly productParserService: ProductParserService) {}

  @Post("parse-text")
  async parseText(@Body() dto: ParseProductTextDto, @Req() req: RequestWithUser) {
    return this.productParserService.parseText(dto, req.user);
  }

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

  @Post("parse-mixed")
  async parseMixed(@Body() dto: ParseProductMixedDto, @Req() req: RequestWithUser) {
    return this.productParserService.parseMixed(dto, req.user);
  }
}
