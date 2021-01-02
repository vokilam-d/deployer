import { BaseGithubEventDto } from '../dtos/base-github-event.dto';
import { EventType } from '../enums/event-type.enum';

export const getEventType = (event: BaseGithubEventDto): EventType => {
  if (event.comment && event.issue) {
    switch (event.action) {
      case 'created':
        return EventType.IssueCommentCreated;
      case 'edited':
        return EventType.IssueCommentUpdated;
    }
  }

  if (event.workflow_run) {
    switch (event.action) {
      case 'requested':
        return EventType.DeployRequested;
      case 'completed':
        return EventType.DeployCompleted;
    }
  }
}
