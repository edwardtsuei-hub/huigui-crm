import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import {
  CreateDiscussionCommentDto,
  UpdateDiscussionCommentDto,
} from "../discussions/dto/discussion.dto";
import { DiscussionsService } from "../discussions/discussions.service";
import { CreateTaskDto, QueryTasksDto, UpdateTaskDto } from "./dto/task.dto";
import { TasksService } from "./tasks.service";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("tasks")
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly discussionsService: DiscussionsService,
  ) {}

  @Permissions("page.schedule.center")
  @Get()
  async list(@Query() query: QueryTasksDto, @Req() req: RequestWithUser) {
    return this.tasksService.list(query, req.user);
  }

  @Permissions("page.schedule.center")
  @Get(":id")
  async getById(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.tasksService.getById(id, req.user);
  }

  @Permissions("page.schedule.center")
  @Get(":id/comments")
  async listComments(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.discussionsService.listTaskComments(id, req.user);
  }

  @Permissions("action.schedule.create")
  @Post()
  async create(@Body() dto: CreateTaskDto, @Req() req: RequestWithUser) {
    return this.tasksService.create(dto, req.user);
  }

  @Permissions("page.schedule.center")
  @Post(":id/comments")
  async createComment(
    @Param("id") id: string,
    @Body() dto: CreateDiscussionCommentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.discussionsService.createTaskComment(id, dto.content, req.user);
  }

  @Permissions("action.schedule.update")
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: RequestWithUser,
  ) {
    return this.tasksService.update(id, dto, req.user);
  }

  @Permissions("page.schedule.center")
  @Patch(":id/comments/:commentId")
  async updateComment(
    @Param("id") id: string,
    @Param("commentId") commentId: string,
    @Body() dto: UpdateDiscussionCommentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.discussionsService.updateTaskComment(
      id,
      commentId,
      dto.content,
      req.user,
    );
  }

  @Permissions("action.schedule.delete")
  @Delete(":id")
  async remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.tasksService.remove(id, req.user);
  }
}
