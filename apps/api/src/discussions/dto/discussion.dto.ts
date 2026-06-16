import { IsString } from "class-validator";

export class CreateDiscussionCommentDto {
  @IsString()
  content!: string;
}

export class UpdateDiscussionCommentDto {
  @IsString()
  content!: string;
}
