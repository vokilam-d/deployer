import { BaseGithubEventDto } from '../dtos/base-github-event.dto';
import { EventType } from '../enums/event-type.enum';

export const getEventType = (event: BaseGithubEventDto): EventType => {
  if (event.comment && event.issue) {
    switch (event.action) {
      case 'created':
        return EventType.AddIssueComment;
      case 'edited':
        return EventType.UpdateIssueComment;
      case 'deleted':
        return EventType.DeleteIssueComment;
    }
  }
}
