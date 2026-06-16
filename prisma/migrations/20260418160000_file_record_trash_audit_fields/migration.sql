ALTER TABLE `FileRecord`
  ADD COLUMN `deletedByUserId` VARCHAR(191) NULL,
  ADD COLUMN `deletedReason` VARCHAR(255) NULL;

CREATE INDEX `FileRecord_deletedByUserId_idx` ON `FileRecord`(`deletedByUserId`);

ALTER TABLE `FileRecord`
  ADD CONSTRAINT `FileRecord_deletedByUserId_fkey`
  FOREIGN KEY (`deletedByUserId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
