import { Module } from '@nestjs/common';
import { ExcelController } from './excel/excel.controller';
import { ExcelService } from './excel/excel.service';
import { Neo4jService } from './neo4j.service';
import { KgController } from './kg.controller';

@Module({
  controllers: [ExcelController, KgController],
  providers: [ExcelService, Neo4jService],
  exports: [Neo4jService],
})
export class KgModule {}
