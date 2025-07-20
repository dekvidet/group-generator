export interface Participant {
  id: string;
  gender: string;
  age: string;
  isGroupLeader: boolean;
  targetAge?: string;
  [key: string]: any; // Allow for arbitrary additional properties that come from CSV columns
}


export type Round = Array<Group>

export interface Group {
  id: number;
  participants: ParticipantWithStatistics[];
  statistics?: Statistics;
}

export interface Statistics {
  genderRatioScore: number;
  targetAgeScore: number;
  groupmateRedundancyScore: number;
  totalScore: number;
}

export interface ParticipantWithStatistics extends Participant {
  statistics: {
    repeatedGroupmateCount: number;
    unmetTargetAgeGroupmateCount: number;
    accumulatedRepeatedGroupmateCount: number;
    accumulatedUnmetTargetAgeGroupmateCounts: number;
  };
}

export interface TargetAgeRange {
  from: string;
  to: string;
  name: string;
}