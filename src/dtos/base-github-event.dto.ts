import { UserDto } from './user.dto';
import { RepositoryDto } from './repository.dto';
import { EventInstallationDto } from './event-installation.dto';

export abstract class BaseGithubEventDto {
  action: string;
  sender: UserDto;
  repository: RepositoryDto;
  organization: any;
  installation: EventInstallationDto;

  [key: string]: any;
}
