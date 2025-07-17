export interface Round extends Array<Group> {}

export interface Group {
  id: number;
  participants: Participant[];
  statistics?: Statistics;
}

export interface Participant {
  id: string;
  gender: string;
  age: string;
  isGroupLeader: boolean;
  targetAge?: string;
  statistics?: {
    groupmateRedundancy?: number;
    unmetTargetAge?: number;
  };
  [key: string]: any; // Allow for arbitrary additional properties
}

export interface Statistics {
  genderRatioScore: number;
  targetAgeScore: number;
  groupmateRedundancyScore: number;
  totalScore: number;
}