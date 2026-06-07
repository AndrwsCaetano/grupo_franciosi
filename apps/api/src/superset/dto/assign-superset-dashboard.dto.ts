import { IsArray, IsString } from 'class-validator';

export class AssignSupersetDashboardDto {
  @IsArray()
  @IsString({ each: true })
  userIds!: string[];
}
