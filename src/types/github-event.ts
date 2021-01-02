import { IssueCommentEventDto } from '../dtos/issue-comment-event.dto';
import { WorkflowRunEventDto } from '../dtos/workflow-run-event.dto';

export type GithubEvent = IssueCommentEventDto | WorkflowRunEventDto;
