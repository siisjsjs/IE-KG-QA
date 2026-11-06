import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDocDto {
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @IsString()
  folderIdRaw?: string;
}
