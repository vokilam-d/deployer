export class CommitCounterPartyDto {
  name: string;
  email: string;
  username: string;
}

export class CommitDto {
  id: string;
  tree_id: string;
  distinct: boolean;
  message: string;
  timestamp: string;
  url: string;
  author: CommitCounterPartyDto;
  committer: CommitCounterPartyDto;
  added: any[];
  removed: any[];
  modified: string[];
}
