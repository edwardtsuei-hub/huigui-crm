import { Module } from "@nestjs/common";
import { AuditService } from "../common/services/audit.service";
import { RecordPartitionService } from "../common/services/record-partition.service";
import { PrismaModule } from "../prisma/prisma.module";
import { CosStorageService } from "./cos-storage.service";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";

@Module({
  imports: [PrismaModule],
  controllers: [FilesController],
  providers: [FilesService, CosStorageService, RecordPartitionService, AuditService],
  exports: [FilesService, CosStorageService]
})
export class FilesModule {}
