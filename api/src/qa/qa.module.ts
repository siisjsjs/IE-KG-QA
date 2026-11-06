import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../common/ai/ai.module';
import { QaLog } from '../entities/qa-log.entity';
import { QaFeedback } from '../entities/qa-feedback.entity';
import { QaController } from './qa.controller';
import { QaService } from './qa.service';

@Module({
  imports: [TypeOrmModule.forFeature([QaLog, QaFeedback]), AiModule],
  controllers: [QaController],
  providers: [QaService],
})
export class QaModule {}
