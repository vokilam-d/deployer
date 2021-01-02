import { RepositoryDto } from './repository.dto';

export class AccessTokenDto {
  token: string;
  expires_at: string;
  permissions: {
    [permission: string]: 'write' | 'read';
  };
  repository_selection: string;
  repositories?: RepositoryDto[];
}
