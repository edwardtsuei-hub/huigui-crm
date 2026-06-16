import { IsObject } from "class-validator";

export class UpdateShiftRosterDto {
  @IsObject()
  config!: Record<string, unknown>;
}
