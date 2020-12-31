import { Injectable } from '@nestjs/common';
import { IssueCommentEventDto } from '../../dtos/issue-comment-event.dto';
import { RepositoryService } from './repository.service';
import { VersionType } from '../../enums/version-type.enum';

@Injectable()
export class DeployerService {

  constructor(
    private readonly repositoryService: RepositoryService
  ) { }

  async onAddIssueComment(eventDto: IssueCommentEventDto): Promise<void> {
    if (eventDto.comment.author_association !== 'OWNER') { return; }

    const versionType = this.getVersionType(eventDto.comment.body);
    if (!versionType) { return; }

    const version = await this.repositoryService.getIncrementVersion(eventDto.repository, versionType);
    await this.repositoryService.createRelease(eventDto.repository, version);
  }

  private getVersionType(str: string): VersionType {
    const types = Object.values(VersionType);
    str = str.toLowerCase();

    return types.find(type => str.includes(`$${type}`));
  }
}
