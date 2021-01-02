import { UserDto } from './user.dto';

export class InstallationDto {
  id: number;
  account: UserDto;
  repository_selection: string;
  access_tokens_url: string;
  repositories_url: string;
  html_url: string;
  app_id: number;
  app_slug: string;
  target_id: number;
  target_type: string;
  permissions: {
    issues: string;
    actions: string;
    contents: string;
    metadata: string;
    workflows: string;
    pull_requests: string;
    repository_hooks: string;
  };
  events: string[];
  created_at: string;
  updated_at: string;
  single_file_name: any;
  has_multiple_single_files: boolean;
  single_file_paths: any[];
  suspended_by: any;
  suspended_at: any;
}
