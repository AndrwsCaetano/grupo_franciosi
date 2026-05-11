import { IsArray, IsString } from 'class-validator';

export class AssignDashboardsDto {
  @IsArray()
  @IsString({ each: true })
  dashboardIds!: string[];
}
