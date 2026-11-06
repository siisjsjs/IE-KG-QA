import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Folder } from '../entities/folder.entity';
import { Doc } from '../entities/doc.entity';
import { Task } from '../entities/task.entity';
import { FoldersController } from './folders/folders.controller';
import { FoldersService } from './folders/folders.service';
import { DocsController } from './docs/docs.controller';
import { DocsService } from './docs/docs.service';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';
import { AiModule } from '../common/ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Folder, Doc, Task]), AiModule],
  controllers: [FoldersController, DocsController, TasksController],
  providers: [FoldersService, DocsService, TasksService],
})
export class DocumentModule {}
