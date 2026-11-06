import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DocsService } from './docs.service';
import { CreateDocDto } from './dto/create-doc.dto';

@UseGuards(JwtAuthGuard)
@Controller('docs')
export class DocsController {
  constructor(private readonly service: DocsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File, @Body() dto: CreateDocDto) {
    return this.service.upload(file, dto);
  }

  @Post(':docId/ingest')
  ingest(@Param('docId') docId: string) {
    return this.service.ingest(docId);
  }
}