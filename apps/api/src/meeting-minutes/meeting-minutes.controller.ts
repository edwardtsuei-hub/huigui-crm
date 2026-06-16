import { Body, Controller, Get, Param, Patch, Post, Put, Req } from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { MeetingMinutesService } from "./meeting-minutes.service";

type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};

@Controller(["meeting-minutes", "v1/meeting-minutes"])
export class MeetingMinutesController {
  constructor(private readonly meetingMinutesService: MeetingMinutesService) {}

  @Public()
  @Get("openai/status")
  getOpenAiStatus() {
    return this.meetingMinutesService.getOpenAiStatus();
  }

  @Get("workspace")
  getWorkspace(@Req() req: RequestWithUser) {
    return this.meetingMinutesService.getWorkspace(req.user);
  }

  @Post("records")
  saveRecord(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.meetingMinutesService.saveRecord(body, req.user);
  }

  @Put("records/:recordId")
  updateRecord(
    @Param("recordId") recordId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.meetingMinutesService.updateRecord(recordId, body, req.user);
  }

  @Post("records/:recordId/discussion")
  appendDiscussionMessage(
    @Param("recordId") recordId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.meetingMinutesService.appendDiscussionMessage(recordId, body, req.user);
  }

  @Patch("records/:recordId/audio-cleaned")
  markAudioCleaned(
    @Param("recordId") recordId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.meetingMinutesService.markAudioCleaned(recordId, body, req.user);
  }

  @Put("folder-permissions/:folderId")
  saveFolderPermission(
    @Param("folderId") folderId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.meetingMinutesService.saveFolderPermission(folderId, body, req.user);
  }

  @Get("audio/tasks")
  listAudioAnalysisTasks() {
    return this.meetingMinutesService.listAudioAnalysisTasks();
  }

  @Get("audio/tasks/:taskId")
  getAudioAnalysisTask(@Param("taskId") taskId: string) {
    return this.meetingMinutesService.getAudioAnalysisTask(taskId);
  }

  @Post("audio/tasks")
  createAudioAnalysisTask(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.meetingMinutesService.createAudioAnalysisTask(
      this.withAuthenticatedCreator(body, req.user),
    );
  }

  @Post("audio/analyze")
  analyzeAudioNow(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.meetingMinutesService.analyzeAudioNow(
      this.withAuthenticatedCreator(body, req.user),
    );
  }

  private withAuthenticatedCreator(
    body: Record<string, unknown> | undefined,
    user?: AuthenticatedUser,
  ) {
    const creator = user?.wecomName ?? user?.name ?? normalizeBodyText(body?.createdBy);
    const creatorId = user?.id ?? normalizeBodyText(body?.createdByUserId);
    return {
      ...(body ?? {}),
      createdBy: creator || "系统",
      createdByUserId: creatorId || undefined,
    };
  }
}

function normalizeBodyText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
