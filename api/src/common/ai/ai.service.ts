import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AiService {
  constructor(private readonly http: HttpService) {}

  async health() {
    try {
      const res = await firstValueFrom(this.http.get('/health'));
      return { ok: true, data: res.data };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? String(e) };
    }
  }

  async ingest(payload: any) {
    const res = await firstValueFrom(this.http.post('/tasks/ingest', payload));
    return res.data;
  }

  async taskStatus(taskId: string) {
    const res = await firstValueFrom(this.http.get(`/tasks/${encodeURIComponent(taskId)}`));
    return res.data;
  }

  async ask(payload: any) {
    const res = await firstValueFrom(this.http.post('/qa/ask', payload));
    return res.data;
  }
}
