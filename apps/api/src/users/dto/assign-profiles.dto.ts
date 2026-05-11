import { IsArray, IsString } from 'class-validator';

export class AssignProfilesDto {
  @IsArray()
  @IsString({ each: true })
  profileIds!: string[];
}
