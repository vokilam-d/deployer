import { BaseGithubEventDto } from './base-github-event.dto';
import { CommitDto } from './commit.dto';

export class CommitPushedEventDto extends BaseGithubEventDto {
  ref: string;
  before: string;
  after: string;
  created: boolean;
  deleted: boolean;
  forced: boolean;
  base_ref: any;
  compare: string;
  commits: CommitDto[];
  head_commit: CommitDto;
}
