export interface Round extends Array<Group> {}

export interface Group {
  id: number;
  participants: Participant[];
  statistics?: Statistics;
}

export interface Statistics {
  genderRatioScore: number;
  targetAgeScore: number;
  groupmateRedundancyScore: number;
  totalScore: number;
}

export interface Participant {
  id: string;
  gender: string;
  age: string;
  isGroupLeader: boolean;
  targetAge?: string;
  statistics?: {
    repeatedGroupmateCount?: number;
    unmetTargetAgeGroupmateCount?: number;
  };
  [key: string]: any; // Allow for arbitrary additional properties that come from CSV columns
}

export interface TargetAgeRange {
  from: string;
  to: string;
  name: string;
}