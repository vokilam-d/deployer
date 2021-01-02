import { Injectable, Logger } from '@nestjs/common';
import { IssueCommentEventDto } from '../../dtos/issue-comment-event.dto';
import { RepositoryService } from './repository.service';
import { VersionType } from '../../enums/version-type.enum';
import { WorkflowRunEventDto } from '../../dtos/workflow-run-event.dto';
import { RepositoryDto } from '../../dtos/repository.dto';
import { IssueDto } from '../../dtos/issue.dto';
import { EventInstallationDto } from '../../dtos/event-installation.dto';

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
    private readonly repositoryService: RepositoryService
  ) { }

  async onAddIssueComment(evt: IssueCommentEventDto): Promise<void> {
    if (evt.comment.author_association !== 'OWNER') { return; }

    const versionType = this.getVersionType(evt.comment.body);
    if (!versionType) { return; }

    const version = await this.repositoryService.getIncrementedVersion(evt.repository, versionType, evt.installation.id);
    await this.repositoryService.createRelease(evt.repository, version, evt.installation.id);

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
    const messageBody = `Deployment of version \`${version}\` finished with status \`${status}\``;
    const comment = `@${author}, ${messageBody}: \n${link}`;

    this.logger.log(messageBody);

    this.repositoryService.createIssueComment(
      linkedPullRequest.repository,
      linkedPullRequest.issue,
      comment,
      evt.installation.id
    );
  }

  private getVersionType(str: string): VersionType {
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
}
