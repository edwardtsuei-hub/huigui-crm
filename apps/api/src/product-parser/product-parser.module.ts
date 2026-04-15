import { Module } from "@nestjs/common";
import { FilesModule } from "../files/files.module";
import { PrismaModule } from "../prisma/prisma.module";
import { FieldMapperService } from "./field-mapper.service";
import { ImageParserService } from "./image-parser.service";
import { ProductParserController } from "./product-parser.controller";
import { ProductParserLogService } from "./product-parser-log.service";
import { ProductParserService } from "./product-parser.service";
import { TextParserService } from "./text-parser.service";

@Module({
  imports: [PrismaModule, FilesModule],
  controllers: [ProductParserController],
  providers: [
    ProductParserService,
    TextParserService,
    ImageParserService,
    FieldMapperService,
    ProductParserLogService
  ]
})
export class ProductParserModule {}
