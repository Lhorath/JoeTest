import { IsUUID } from "class-validator";

export class UpgradeSubmissionDto {
  @IsUUID()
  tierSnapshotId: string;
}
