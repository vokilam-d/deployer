import { Body, Controller, Post } from '@nestjs/common';
import { DeployerService } from '../services/deployer.service';
import { getEventType } from '../../functions/get-event-type.function';
import { EventType } from '../../enums/event-type.enum';
import { GithubEvent } from '../../types/github-event';
import { IssueCommentEventDto } from '../../dtos/issue-comment-event.dto';
import { WorkflowRunEventDto } from '../../dtos/workflow-run-event.dto';
import { CommitPushedEventDto } from '../../dtos/commit-pushed-event.dto';

@Controller()
export class DeployerController {

  constructor(private deployerService: DeployerService) { }

  @Post('webhook')
  webhook(@Body() body: GithubEvent): void {
    const eventType = getEventType(body);

    switch (eventType) {
      case EventType.IssueCommentCreated:
        this.deployerService.onAddIssueComment(body as IssueCommentEventDto);
        break;
      case EventType.DeployRequested:
        this.deployerService.onDeployRequested(body as WorkflowRunEventDto);
        break;
      case EventType.DeployCompleted:
        this.deployerService.onDeployCompleted(body as WorkflowRunEventDto);
        break;
      case EventType.CommitPushed:
        this.deployerService.onCommitPushed(body as CommitPushedEventDto);
        break;
    }
  }
}
