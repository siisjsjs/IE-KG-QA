import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../common/ai/ai.service';
import { QaLog } from '../entities/qa-log.entity';
import { QaFeedback } from '../entities/qa-feedback.entity';
import { AskDto } from './dto/ask.dto';
import { FeedbackDto } from './dto/feedback.dto';

@Injectable()
export class QaService {
  constructor(
    private readonly ai: AiService,
    @InjectRepository(QaLog) private readonly logs: Repository<QaLog>,
    @InjectRepository(QaFeedback) private readonly feedbacks: Repository<QaFeedback>,
  ) {}

  async ask(dto: AskDto, user?: { id?: string }) {
    const log = this.logs.create({
      userId: user?.id,
      question: dto.question,
    });
    const saved = await this.logs.save(log);

    const aiResp = await this.ai.ask({ question: dto.question, ...(dto.context ? { context: dto.context } : {}) });

    saved.aiResponseJson = JSON.stringify(aiResp ?? null);
    if (aiResp && typeof aiResp === 'object') {
      const answer = (aiResp.answer ?? aiResp.data?.answer ?? aiResp.result?.answer) as any;
      if (typeof answer === 'string') saved.answer = answer;
    }
    await this.logs.save(saved);

    return { qaLogId: saved.id, ai: aiResp, answer: saved.answer };
  }

  async feedback(dto: FeedbackDto) {
    const exists = await this.logs.findOne({ where: { id: dto.qaLogId } });
    if (!exists) {
      const fb = this.feedbacks.create({ qaLogId: dto.qaLogId, satisfied: dto.satisfied, note: dto.note });
      return this.feedbacks.save(fb);
    }

    const fb = this.feedbacks.create({ qaLogId: dto.qaLogId, satisfied: dto.satisfied, note: dto.note });
    return this.feedbacks.save(fb);
  }
}
