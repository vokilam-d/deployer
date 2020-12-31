import { Injectable, Logger } from '@nestjs/common';
import { VersionType } from '../../enums/version-type.enum';
import { RepositoryDto } from '../../dtos/repository.dto';
import { GithubApiService } from './github-api.service';
import { TagDto } from '../../dtos/tag.dto';

interface IParsedVersion {
  major: number;
  minor: number;
  patch: number;
}
@Injectable()
export class RepositoryService {

  private logger = new Logger(RepositoryService.name);

  constructor(private readonly api: GithubApiService) { }

  async getIncrementVersion(repository: RepositoryDto, versionType: VersionType): Promise<string> {
    const path = `/repos/${repository.owner.login}/${repository.name}/tags`;

    let tags: TagDto[];
    try {
      tags = await this.api.get(path);
    } catch (e) {
      this.logger.error(`Could not get repository tags:`);
      this.logger.error(e);
    }

    let parsedVersion: IParsedVersion;
    try {
      parsedVersion = this.parseVersion(tags);
    } catch (e) {
      this.logger.error(`Could not parse version from tags:`);
      this.logger.error(e);
    }

    parsedVersion[versionType] += 1;

    return `v${parsedVersion.major}.${parsedVersion.minor}.${parsedVersion.patch}`;
  }

  async createRelease(repository: RepositoryDto, tag: string) {
    const path = `/repos/${repository.owner.login}/${repository.name}/releases`;

    try {
      await this.api.post(path, { tag_name: tag, draft: true });
    } catch (e) {
      this.logger.error(`Could not create release:`);
      this.logger.error(e);
    }
  }

  private parseVersion(tags: TagDto[]): IParsedVersion {
    const versionRegex = /v([0-9]+).([0-9]+).([0-9]+)/;
    let index = 0;
    let matchArray: RegExpMatchArray = null;

    while (index < tags.length && matchArray === null) {
      const tag = tags[index].name;
      matchArray = tag.match(versionRegex);

      index++;
    }

    if (matchArray === null) {
      throw new Error(`Could not find appropriate tag`);
    }

    return {
      major: +matchArray[1],
      minor: +matchArray[2],
      patch: +matchArray[3]
    };
  }
}
