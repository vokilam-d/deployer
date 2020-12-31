import { Body, Controller, Post } from '@nestjs/common';
import { DeployerService } from '../services/deployer.service';
import { getEventType } from '../../functions/get-event-type.function';
import { EventType } from '../../enums/event-type.enum';
import { GithubEvent } from '../../types/github-event';

@Controller()
export class DeployerController {

  constructor(private deployerService: DeployerService) { }

  @Post('webhook')
  webhook(@Body() body: GithubEvent): void {
    const eventType = getEventType(body);

    switch (eventType) {
      case EventType.AddIssueComment:
        this.deployerService.onAddIssueComment(body);
        break;
    }
  }
}
