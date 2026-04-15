import { Injectable } from "@nestjs/common";
import { WecomCalendarEventDto } from "./dto/wecom.dto";

@Injectable()
export class WecomCalendarService {
  async createCalendarEvent(payload: WecomCalendarEventDto) {
    return this.buildStubResponse("create", payload);
  }

  async updateCalendarEvent(payload: WecomCalendarEventDto) {
    return this.buildStubResponse("update", payload);
  }

  async deleteCalendarEvent(payload: WecomCalendarEventDto) {
    return this.buildStubResponse("delete", payload);
  }

  private buildStubResponse(action: string, payload: WecomCalendarEventDto) {
    return {
      success: false,
      implemented: false,
      stage: "phase-2",
      action,
      message: "企业微信日历同步将在第二阶段启用，当前接口已预留",
      payload
    };
  }
}
