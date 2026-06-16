import { IsIn } from "class-validator";

export const notificationActions = [
  "TASK_DONE",
  "TASK_DOING",
  "TASK_TODO",
  "TASK_DELAY_1D",
  "TASK_DELAY_3D",
  "TASK_DELAY_7D",
] as const;

export type NotificationAction = (typeof notificationActions)[number];

export class NotificationActionDto {
  @IsIn(notificationActions)
  action!: NotificationAction;
}
