import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { WecomCalendarService } from "./wecom-calendar.service";

@Injectable()
export class WecomCalendarRetryService {
  private readonly logger = new Logger(WecomCalendarRetryService.name);

  constructor(private readonly wecomCalendarService: WecomCalendarService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async retryPendingAndFailedSchedules() {
    const result = await this.wecomCalendarService.retryPendingAndFailed(10);

    if (result.retried || result.skipped) {
      this.logger.log(
        `企业微信日历巡检完成 scanned=${result.scanned} retried=${result.retried} synced=${result.synced} failed=${result.failed} skipped=${result.skipped}`
      );
    }
  }
}
