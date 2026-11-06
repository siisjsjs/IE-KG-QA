import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AskDto } from './dto/ask.dto';
import { FeedbackDto } from './dto/feedback.dto';
import { QaService } from './qa.service';

@UseGuards(JwtAuthGuard)
@Controller('qa')
export class QaController {
  constructor(private readonly service: QaService) {}

  @Post('ask')
  async ask(@Body() dto: AskDto, @CurrentUser() user?: any) {
    return this.service.ask(dto, user);
  }

  @Post('feedback')
  async feedback(@Body() dto: FeedbackDto) {
    return this.service.feedback(dto);
  }
}