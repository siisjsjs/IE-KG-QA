import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class FeedbackDto {
  @IsUUID()
  qaLogId: string;

  @IsBoolean()
  satisfied: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
