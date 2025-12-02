import { Injectable, Logger } from '@nestjs/common';
import { IssueCommentEventDto } from '../../dtos/issue-comment-event.dto';
import { RepositoryService } from './repository.service';
import { VersionType } from '../../enums/version-type.enum';
import { WorkflowRunEventDto } from '../../dtos/workflow-run-event.dto';
import { RepositoryDto } from '../../dtos/repository.dto';
import { IssueDto } from '../../dtos/issue.dto';
import { EventInstallationDto } from '../../dtos/event-installation.dto';
import { CommitPushedEventDto } from '../../dtos/commit-pushed-event.dto';
import { CommitDto } from '../../dtos/commit.dto';

type VersionKey = string;
type WorkflowId = string;
interface LinkedPullRequest {
  repository: RepositoryDto;
  issue: IssueDto;
  version: string;
}

@Injectable()
export class DeployerService {

  private logger = new Logger(DeployerService.name);
  private versionsPendingDeploy: Map<VersionKey, LinkedPullRequest> = new Map();
  private deploysInProgress: Map<WorkflowId, LinkedPullRequest> = new Map();

  constructor(
    private readonly repositoryService: RepositoryService,
  ) { }

  async onAddIssueComment(evt: IssueCommentEventDto): Promise<void> {
    if (!this.canDeployFromComment(evt)) { return; }

    const versionType = this.getVersionTypeFromStr(evt.comment.body);
    const version = await this.createIncrementedRelease(versionType, evt.repository, evt.installation, 'comment');
    const versionKey = this.getVersionKey(version, evt.installation);
    this.versionsPendingDeploy.set(versionKey, { repository: evt.repository, issue: evt.issue, version });
  }

  async onDeployRequested(evt: WorkflowRunEventDto) {
    const versionKey = this.getVersionKey(evt.workflow_run.head_branch, evt.installation);
    const linkedPullRequest = this.versionsPendingDeploy.get(versionKey);
    if (!linkedPullRequest) {
      return;
    }

    this.versionsPendingDeploy.delete(versionKey);

    const workflowKey = this.getWorkflowKey(evt);
    this.deploysInProgress.set(workflowKey, linkedPullRequest);
  }

  async onDeployCompleted(evt: WorkflowRunEventDto) {
    const workflowKey = this.getWorkflowKey(evt);
    const linkedPullRequest = this.deploysInProgress.get(workflowKey);
    if (!linkedPullRequest) {
      return;
    }

    this.deploysInProgress.delete(workflowKey);

    const author = linkedPullRequest.issue.user.login;
    const version = linkedPullRequest.version;
    const status = evt.workflow_run.conclusion;
    const link = evt.workflow_run.html_url;

    let messageBody: string = ``;
    if (status === 'failure') {
      messageBody += `❌ Failed deployment! Please, check the logs`;
    } else if (status === 'success') {
      messageBody += `✅ Success. Version: \`${version}\``;
    } else {
      messageBody += `Deployment of version \`${version}\` finished with status \`${status}\``;
    }
    const comment = `@${author}, ${messageBody} \n${link}`;

    this.logger.log(messageBody);

    this.repositoryService.createIssueComment(
      linkedPullRequest.repository,
      linkedPullRequest.issue,
      comment,
      evt.installation.id
    );
  }

  async onCommitPushed(evt: CommitPushedEventDto): Promise<void> {
    const refSplit = evt.ref.split('/');
    const isDefaultBranch = refSplit[refSplit.length - 1] === evt.repository.default_branch;
    if (!isDefaultBranch) { return; }

    if (evt.forced && evt.before) {
      await this.handleAmendedCommit(evt.repository, evt.before, evt.installation.id);
    }

    const [versionType, commit] = this.getVersionTypeFromOwnerCommit(evt.commits, evt.repository);
    await this.createIncrementedRelease(versionType, evt.repository, evt.installation, `commit ${commit?.id.slice(0, 8)}`);
  }

  private async createIncrementedRelease(
    versionType: VersionType,
    repository: RepositoryDto,
    installation: EventInstallationDto,
    reason: string
  ): Promise<string> {

    if (!versionType) { return; }

    const version = await this.repositoryService.getIncrementedVersion(repository, versionType, installation.id);
    await this.repositoryService.createRelease(repository, version, installation.id, reason);

    return version;
  }

  private getVersionTypeFromOwnerCommit(commits: CommitDto[], repository: RepositoryDto): [VersionType, CommitDto] {
    for (const commit of commits) {
      if (commit.committer.username !== repository.owner.login) {
        continue;
      }

      const versionType = this.getVersionTypeFromStr(commit.message);
      if (!versionType) {
        continue;
      }

      return [versionType, commit];
    }

    return [null, null];
  }

  private getVersionTypeFromStr(str: string): VersionType {
    const types = Object.values(VersionType);
    str = str.toLowerCase();

    return types.find(type => str.includes(`$${type}`));
  }

  private getVersionKey(version: string, installationDto: EventInstallationDto): VersionKey {
    return `${version}-${installationDto.id}`;
  }

  private getWorkflowKey(evt: WorkflowRunEventDto): VersionKey {
    return `${evt.workflow_run.id}-${evt.installation.id}`;
  }

  private canDeployFromComment(commentEvent: IssueCommentEventDto): boolean {
    return commentEvent.comment.author_association === 'OWNER' || commentEvent.comment.author_association === 'COLLABORATOR';
  }

  private async handleAmendedCommit(
    repository: RepositoryDto,
    oldCommitSha: string,
    installId: number
  ): Promise<void> {
    try {
      // Check if old commit has tags/releases
      const tags = await this.repositoryService.getTagsForCommit(repository, oldCommitSha, installId);
      const releases = await this.repositoryService.getReleasesForCommit(repository, oldCommitSha, installId);

      if (tags.length === 0 && releases.length === 0) {
        // No tags or releases to clean up
        return;
      }

      // Check if old commit no longer belongs to any branch
      const isInAnyBranch = await this.repositoryService.isCommitInAnyBranch(repository, oldCommitSha, installId);

      if (!isInAnyBranch) {
        // This is an amended commit - delete tags and releases
        this.logger.debug(`Detected amended commit ${oldCommitSha.slice(0, 8)}. Cleaning up ${tags.length} tag(s) and ${releases.length} release(s).`);

        // Delete releases first (they reference tags)
        for (const release of releases) {
          try {
            await this.repositoryService.deleteRelease(repository, release.id, installId);
          } catch (e) {
            this.logger.error(`Failed to delete release ${release.id} (${release.tag_name}):`);
            this.logger.error(e);
            // Continue with other deletions even if one fails
          }
        }

        // Delete tags
        for (const tag of tags) {
          try {
            await this.repositoryService.deleteTag(repository, tag.name, installId);
          } catch (e) {
            this.logger.error(`Failed to delete tag ${tag.name}:`);
            this.logger.error(e);
            // Continue with other deletions even if one fails
          }
        }

        this.logger.log(`Successfully cleaned up ${tags.length} tag(s) and ${releases.length} release(s) for amended commit ${oldCommitSha.slice(0, 8)}`);
      }
    } catch (e) {
      this.logger.error(`Error handling amended commit ${oldCommitSha.slice(0, 8)}:`);
      this.logger.error(e);
      // Don't throw - allow the process to continue with creating the new release
    }
  }
}
