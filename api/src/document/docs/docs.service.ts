import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Doc } from '../../entities/doc.entity';
import { CreateDocDto } from './dto/create-doc.dto';
import { AiService } from '../../common/ai/ai.service';
import { Task } from '../../entities/task.entity';

@Injectable()
export class DocsService {
  constructor(
    @InjectRepository(Doc) private readonly docs: Repository<Doc>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    private readonly cfg: ConfigService,
    private readonly ai: AiService,
  ) {}

  private uploadsDir(): string {
    const configured = this.cfg.get<string>('UPLOAD_DIR');
    if (configured && configured.trim()) return configured;
    return path.resolve(process.cwd(), 'data', 'uploads');
  }

  async list() {
    return this.docs.find({ order: { createdAt: 'DESC' } });
  }

  async get(id: string) {
    const doc = await this.docs.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('doc not found');
    return doc;
  }

  async upload(file: Express.Multer.File, dto: CreateDocDto) {
    if (!file) throw new BadRequestException('file is required');

    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedExt = new Set(['.pdf', '.txt']);
    if (!allowedExt.has(ext)) throw new BadRequestException('only pdf/txt allowed');

    const storageName = `${randomUUID()}${ext}`;
    const dir = this.uploadsDir();
    await fs.mkdir(dir, { recursive: true });

    const storagePath = path.resolve(dir, storageName);
    await fs.writeFile(storagePath, file.buffer);

    const doc = this.docs.create({
      folderId: dto.folderId,
      originalName: file.originalname,
      storageName,
      storagePath,
      mimeType: file.mimetype || 'application/octet-stream',
      size: String(file.size ?? 0),
      status: 'uploaded',
    });

    return this.docs.save(doc);
  }

  async ingest(docId: string) {
    const doc = await this.docs.findOne({ where: { id: docId } });
    if (!doc) throw new NotFoundException('doc not found');

    const task = this.tasks.create({
      type: 'ingest',
      docId,
      requestJson: JSON.stringify({ docId: doc.id, filePath: doc.storagePath }),
      status: 'pending',
    });
    const saved = await this.tasks.save(task);

    try {
      const resp = await this.ai.ingest({ doc_id: doc.id, file_path: doc.storagePath });
      saved.status = 'running';
      saved.responseJson = JSON.stringify(resp ?? null);

      if (resp && typeof resp === 'object' && (resp as any).task_id) {
        saved.aiTaskId = String((resp as any).task_id);
      } else {
        // If AI service returns immediately without a task_id, we assume it's done.
        saved.status = 'done';
      }
      await this.tasks.save(saved);

      return saved;
    } catch (e: any) {
      saved.status = 'error';
      saved.responseJson = JSON.stringify({ 
        error: e?.message ?? String(e),
        stack: e?.stack,
        phase: 'ai_ingest_call',
        aiBaseUrl: this.cfg.get<string>('AI_BASE_URL') ?? 'http://localhost:9000',
        docId,
        filePath: doc.storagePath
      });
      await this.tasks.save(saved);
      return saved;
    }
  }
}
