import { UserDto } from './user.dto';

export class CommentDto {
  url: string;
  html_url: string;
  issue_url: string;
  id: number;
  node_id: string;
  user: UserDto;
  created_at: string;
  updated_at: string;
  author_association: 'OWNER' | string;
  body: string;
  performed_via_github_app: any;
}
