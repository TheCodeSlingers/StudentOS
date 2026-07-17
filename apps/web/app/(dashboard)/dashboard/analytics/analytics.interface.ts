export interface PlacementMetric {
  status: string;
  count: number;
  color: string;
}

export interface SkillMetric {
  skill: string;
  count: number;
}

export interface TopLevelStats {
  totalStudents: number;
  activelyLooking: number;
  employed: number;
  avgSkills: number;
}
