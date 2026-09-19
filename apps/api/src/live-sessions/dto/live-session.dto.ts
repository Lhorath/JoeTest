import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
} from "class-validator";
import { StreamingPlatform } from "@platform/types";

export class CreateLiveSessionDto {
  @IsUUID()
  stationId: string;

  @IsString()
  @IsNotEmpty()
  liveTitle: string;

  @IsEnum(StreamingPlatform)
  primaryStreamingPlatform: StreamingPlatform;

  @IsString()
  @IsNotEmpty()
  savedProfileUrlSnapshot: string;
}

export class ExpectedQueueRevisionDto {
  @IsNumber()
  @IsNotEmpty()
  expectedQueueRevision: number;
}

export class AddQueueEntryDto extends ExpectedQueueRevisionDto {
  @IsUUID()
  submissionId: string;
}

export interface SafeLiveSessionResponse {
  id: string;
  stationId: string;
  status: string;
  liveTitle: string;
  queueRevision: number;
}

export interface SafeSubmissionResponse {
  id: string;
  isPriority: boolean;
  currentQueueStatus: string;
  submittedAt: Date;
}

export interface SafeQueueEntryResponse {
  id: string;
  liveSessionId: string;
  status: string;
  sortOrder: number;
  priorityRank: number;
  submission: SafeSubmissionResponse;
}

export class MoveToNextDto extends ExpectedQueueRevisionDto {}
export class LoadQueueEntryDto extends ExpectedQueueRevisionDto {}
export class ClearPlayerDto extends ExpectedQueueRevisionDto {}
export class PlayNextDto extends ExpectedQueueRevisionDto {}

export class QueueEntryActionDto {
  @IsOptional()
  @IsNumber()
  expectedQueueRevision?: number;

  @IsOptional()
  @IsString()
  action?: "SKIP" | "COMPLETE";
}

export enum ReorderIntent {
  BEFORE = "BEFORE",
  AFTER = "AFTER",
  TOP = "TOP",
  BOTTOM = "BOTTOM",
}

export class ReorderQueueEntryDto extends ExpectedQueueRevisionDto {
  @IsEnum(ReorderIntent)
  intent: ReorderIntent;

  @IsOptional()
  @IsUUID()
  targetEntryId?: string;
}

export {
  PublicLiveSessionSummary,
  PublicLiveSessionDetail,
  PublicQueueEntry,
} from "@platform/types";

import { HostManualTierChangeDto as SubmissionsTierChangeDto } from "../../submissions/dto/submission.dto";
export { HostManualTierChangeDto } from "../../submissions/dto/submission.dto";

