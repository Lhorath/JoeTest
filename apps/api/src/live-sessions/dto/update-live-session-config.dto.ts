import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsUUID,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateFreeLineConfigDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  maxFreeSubmissionsPerUser?: number | null;

  @IsOptional()
  @IsNumber()
  totalFreeCapacityLimit?: number | null;

  @IsOptional()
  @IsNumber()
  activeEntryCapacityLimit?: number | null;
}

export class UpdatePriorityTierConfigDto {
  @IsUUID()
  id: string; // LivePriorityTierSnapshot ID

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  priceCents?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  maxPurchasesPerUserPerLive?: number | null;
}

export class UpdateLiveSessionConfigDto {
  @IsOptional()
  @IsBoolean()
  submissionsOpen?: boolean;

  @IsOptional()
  @IsBoolean()
  freeLineOpen?: boolean;

  @IsOptional()
  @IsBoolean()
  paidSubmissionsOpen?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateFreeLineConfigDto)
  freeLine?: UpdateFreeLineConfigDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePriorityTierConfigDto)
  priorityTiers?: UpdatePriorityTierConfigDto[];
}
