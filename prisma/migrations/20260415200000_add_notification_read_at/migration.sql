ALTER TABLE `Notification`
  ADD COLUMN `readAt` DATETIME(3) NULL;

CREATE INDEX `Notification_userId_readAt_idx` ON `Notification`(`userId`, `readAt`);
