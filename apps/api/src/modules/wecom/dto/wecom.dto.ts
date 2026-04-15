import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class WecomLoginDto {
  @IsString()
  @MinLength(1)
  code!: string;
}

export class WecomSendMessageDto {
  @IsString()
  @MinLength(1)
  toUser!: string;

  @IsString()
  @IsIn(["text"])
  msgType!: "text";

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @MinLength(1)
  content!: string;
}

export class WecomCallbackQueryDto {
  @IsString()
  msg_signature!: string;

  @IsString()
  timestamp!: string;

  @IsString()
  nonce!: string;

  @IsOptional()
  @IsString()
  echostr?: string;
}

export class WecomCalendarEventDto {
  @IsOptional()
  @IsString()
  calendarId?: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  startAt?: string;

  @IsOptional()
  @IsString()
  endAt?: string;

  @IsOptional()
  @IsString()
  attendeeUserId?: string;
}
