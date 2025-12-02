import { Injectable, Logger } from '@nestjs/common';
import { VersionType } from '../../enums/version-type.enum';
import { RepositoryDto } from '../../dtos/repository.dto';
import { GithubApiService } from './github-api.service';
import { TagDto } from '../../dtos/tag.dto';
import { IssueDto } from '../../dtos/issue.dto';

interface IParsedVersion {
  major: number;
  minor: number;
  patch: number;
}
@Injectable()
export class RepositoryService {

  private logger = new Logger(RepositoryService.name);

  constructor(private readonly api: GithubApiService) { }

  async getIncrementedVersion(repository: RepositoryDto, versionType: VersionType, installId: number): Promise<string> {
    const path = `/repos/${repository.owner.login}/${repository.name}/tags`;

    let tags: TagDto[];
    try {
      tags = await this.api.get(path, undefined, installId);
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
    switch (versionType) {
      case VersionType.Major:
        parsedVersion.minor = 0;
      case VersionType.Minor:
        parsedVersion.patch = 0;
        break;
    }

    return `v${parsedVersion.major}.${parsedVersion.minor}.${parsedVersion.patch}`;
  }

  async createRelease(repository: RepositoryDto, tag: string, installId: number, reason: string) {
    const path = `/repos/${repository.owner.login}/${repository.name}/releases`;

    try {
      await this.api.post(path, { tag_name: tag }, undefined, installId);
      this.logger.debug(`Created release "${tag}" at "${repository.full_name}". Reason source: "${reason}"`);
    } catch (e) {
      this.logger.error(`Could not create release:`);
      this.logger.error(e);
    }
  }

  async createIssueComment(repository: RepositoryDto, issue: IssueDto, comment: string, installId: number) {
    const path = `/repos/${repository.owner.login}/${repository.name}/issues/${issue.number}/comments`;

    try {
      const commentDto = await this.api.post(path, { body: comment }, undefined, installId);
      this.logger.debug(`Created comment at issue ${commentDto.html_url}`);
    } catch (e) {
      this.logger.error(`Could not create issue comment:`);
      this.logger.error(e);
    }
  }

  async getTagsForCommit(repository: RepositoryDto, commitSha: string, installId: number): Promise<TagDto[]> {
    const path = `/repos/${repository.owner.login}/${repository.name}/tags`;

    try {
      const tags: TagDto[] = await this.api.get(path, undefined, installId);
      return tags.filter(tag => tag.commit.sha === commitSha);
    } catch (e) {
      this.logger.error(`Could not get tags for commit ${commitSha}:`);
      this.logger.error(e);
      return [];
    }
  }

  async getReleasesForCommit(
    repository: RepositoryDto,
    commitSha: string,
    installId: number
  ): Promise<Array<{ id: number; tag_name: string }>> {
    const path = `/repos/${repository.owner.login}/${repository.name}/releases`;
    const releases: Array<{ id: number; tag_name: string }> = [];

    try {
      const allReleases = await this.api.get(path, undefined, installId);
      const tagsForCommit = await this.getTagsForCommit(repository, commitSha, installId);
      const tagNames = new Set(tagsForCommit.map(tag => tag.name));

      for (const release of allReleases) {
        if (tagNames.has(release.tag_name)) {
          releases.push({ id: release.id, tag_name: release.tag_name });
        }
      }
    } catch (e) {
      this.logger.error(`Could not get releases for commit ${commitSha}:`);
      this.logger.error(e);
    }

    return releases;
  }

  async isCommitInAnyBranch(repository: RepositoryDto, commitSha: string, installId: number): Promise<boolean> {
    const path = `/repos/${repository.owner.login}/${repository.name}/commits/${commitSha}/branches-where-head`;

    try {
      const branches = await this.api.get(path, undefined, installId);
      return Array.isArray(branches) && branches.length > 0;
    } catch (e) {
      this.logger.error(`Could not check if commit ${commitSha} belongs to any branch:`);
      this.logger.error(e);
      return false;
    }
  }

  async deleteTag(repository: RepositoryDto, tagName: string, installId: number): Promise<void> {
    const path = `/repos/${repository.owner.login}/${repository.name}/git/refs/tags/${tagName}`;

    try {
      await this.api.delete(path, undefined, installId);
      this.logger.debug(`Deleted tag "${tagName}" from "${repository.full_name}"`);
    } catch (e) {
      this.logger.error(`Could not delete tag "${tagName}":`);
      this.logger.error(e);
      throw e;
    }
  }

  async deleteRelease(repository: RepositoryDto, releaseId: number, installId: number): Promise<void> {
    const path = `/repos/${repository.owner.login}/${repository.name}/releases/${releaseId}`;

    try {
      await this.api.delete(path, undefined, installId);
      this.logger.debug(`Deleted release "${releaseId}" from "${repository.full_name}"`);
    } catch (e) {
      this.logger.error(`Could not delete release "${releaseId}":`);
      this.logger.error(e);
      throw e;
    }
  }

  private parseVersion(tags: TagDto[]): IParsedVersion {
    const versionRegex = /v([0-9]+).([0-9]+).([0-9]+)/;
    let index = 0;
    let matchArray: RegExpMatchArray | null = null;

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
