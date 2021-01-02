import { UserDto } from './user.dto';
import { RepositoryDto } from './repository.dto';

export abstract class BaseGithubEventDto {
  action: string;
  sender: UserDto;
  repository: RepositoryDto;
  organization: any;
  installation: {
    id: number;
    node_id: string;
  };

  [key: string]: any;
}
