import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CosStorageService } from "./cos-storage.service";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";

@Module({
  imports: [PrismaModule],
  controllers: [FilesController],
  providers: [FilesService, CosStorageService],
  exports: [FilesService, CosStorageService]
})
export class FilesModule {}
