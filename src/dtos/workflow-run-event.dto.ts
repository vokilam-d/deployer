import { BaseGithubEventDto } from './base-github-event.dto';
import { RepositoryDto } from './repository.dto';

export class WorkflowRunEventDto extends BaseGithubEventDto {
  workflow_run: {
    id: number;
    name: string;
    node_id: string;
    head_branch: string;
    head_sha: string;
    run_number: number;
    event: string;
    status: string;
    conclusion: string;
    workflow_id: number;
    check_suite_id: number;
    check_suite_node_id: string;
    url: string;
    html_url: string;
    pull_requests: any[];
    created_at: string;
    updated_at: string;
    jobs_url: string;
    logs_url: string;
    check_suite_url: string;
    artifacts_url: string;
    cancel_url: string;
    rerun_url: string;
    workflow_url: string;
    head_commit: {
      id: string;
      tree_id: string;
      message: string;
      timestamp: string;
      author: any;
      committer: any;
    };
    repository: RepositoryDto;
    head_repository: RepositoryDto;
  };
  workflow: {
    id: number;
    node_id: string;
    name: string;
    path: string;
    state: string;
    created_at: string;
    updated_at: string;
    url: string;
    html_url: string;
    badge_url: string;
  };
}

