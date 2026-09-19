import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class SearchTrackDto {
  @IsString()
  @IsNotEmpty()
  query: string;
}

export class CreateTrackUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  songName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  artistName: string;

  @IsString()
  @IsNotEmpty()
  originalFilename: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsNumber()
  @Min(1)
  fileSize: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  albumName?: string;

  @IsOptional()
  @IsBoolean()
  explicitContent?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bpm?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  musicalKey?: string;
}

export class CompleteTrackUploadDto {
  // Empty DTO for now, future proofing
}

export class ReplaceTrackAudioUrlDto {
  @IsString()
  @IsNotEmpty()
  originalFilename: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsNumber()
  @Min(1)
  fileSize: number;
}

export class CreateArtworkUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  originalFilename: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsNumber()
  @Min(1)
  fileSize: number;
}

export class UpdateTrackDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  songName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  artistName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  albumName?: string;

  @IsOptional()
  @IsBoolean()
  explicitContent?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bpm?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  musicalKey?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
