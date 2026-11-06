import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateMenuDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsString()
  parentId?: string;
}
