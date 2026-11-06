import {
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ExcelService } from './excel.service';
import { Neo4jService } from '../neo4j.service';

@UseGuards(JwtAuthGuard)
@Controller('kg/excel')
export class ExcelController {
  constructor(
    private readonly excel: ExcelService,
    private readonly neo4j: Neo4jService,
  ) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    const triples = this.excel.parseTriples(file.buffer);
    const res = await this.neo4j.upsertTriples(triples);
    return { ok: true, triples: triples.length, neo4j: res };
  }

  @Get('export')
  async exportExcel(@Res() res: Response) {
    const triples = await this.neo4j.exportTriples();
    const buf = this.excel.buildExcel(triples);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="triples.xlsx"');
    res.send(buf);
  }
}
