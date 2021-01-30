import { IssueCommentEventDto } from '../dtos/issue-comment-event.dto';
import { WorkflowRunEventDto } from '../dtos/workflow-run-event.dto';
import { CommitPushedEventDto } from '../dtos/commit-pushed-event.dto';

export type GithubEvent = IssueCommentEventDto | WorkflowRunEventDto | CommitPushedEventDto;
