export interface Participant {
  id: string;
  gender: string;
  age: string;
  isGroupLeader: boolean;
  leaderPreference: 'voluntary' | 'indifferent' | 'no';
  familyName?: string;
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
}

export interface ParticipantWithStatistics extends Participant {
  statistics: {
    repeatedGroupmateCount: number;
    unmetTargetAgeGroupmateCount: number;
    accumulatedRepeatedGroupmateCount: number;
    accumulatedUnmetTargetAgeGroupmateCounts: number;
    ageSatisfactionScore: number | null;
  };
}

export interface TargetAgeRange {
  from: string;
  to: string;
  name: string;
}
