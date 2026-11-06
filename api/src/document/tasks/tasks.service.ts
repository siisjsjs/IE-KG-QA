import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { AiService } from '../../common/ai/ai.service';
import { Doc } from '../../entities/doc.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(Doc) private readonly docs: Repository<Doc>,
    private readonly ai: AiService,
  ) {}

  async get(taskId: string) {
    const task = await this.tasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('task not found');

    if (task.type === 'ingest' && task.aiTaskId) {
      try {
        const resp = await this.ai.taskStatus(String(task.aiTaskId));
        task.responseJson = JSON.stringify(resp ?? null);

        const status = String((resp as any)?.status ?? (resp as any)?.state ?? '').toLowerCase();
        const progress = (resp as any)?.progress ?? (resp as any)?.percent;

        if (status) {
          if (['done', 'success', 'completed', 'finished'].includes(status)) task.status = 'done';
          else if (['error', 'failed', 'fail'].includes(status)) task.status = 'error';
          else task.status = 'running';
        }

        if (typeof progress === 'number') {
          (task as any).progress = progress;
        }

        await this.tasks.save(task);
      } catch {
      }
    }

    return task;
  }

  async ingest(docId: string) {
    const doc = await this.docs.findOne({ where: { id: docId } });
    if (!doc) throw new NotFoundException('doc not found');

    const task = this.tasks.create({
      type: 'ingest',
      docId,
      requestJson: JSON.stringify({ docId, path: doc.storagePath, originalName: doc.originalName }),
      status: 'pending',
    });
    const saved = await this.tasks.save(task);

    try {
      const resp = await this.ai.ingest({ doc_id: docId, file_path: doc.storagePath });
      saved.responseJson = JSON.stringify(resp ?? null);
      saved.status = 'running';
      if (resp && typeof resp === 'object' && (resp as any).task_id) {
        saved.aiTaskId = String((resp as any).task_id);
      } else {
        saved.status = 'done';
      }
      await this.tasks.save(saved);
      return saved;
    } catch (e: any) {
      saved.status = 'error';
      saved.responseJson = JSON.stringify({ error: e?.message ?? String(e) });
      await this.tasks.save(saved);
      return saved;
    }
  }
}
