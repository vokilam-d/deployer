import { BaseGithubEventDto } from './base-github-event.dto';
import { IssueDto } from './issue.dto';
import { CommentDto } from './comment.dto';

export class IssueCommentEventDto extends BaseGithubEventDto {
  action: 'created' | 'updated' | 'deleted';
  issue: IssueDto;
  comment: CommentDto;
}
