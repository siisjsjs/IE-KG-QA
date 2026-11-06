import { IsObject, IsOptional, IsString } from 'class-validator';

export class AskDto {
  @IsString()
  question: string;

  @IsOptional()
  @IsObject()
  context?: any;
}
