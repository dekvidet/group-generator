
import { create } from 'zustand';

interface AppState {
  file: File | null;
  headers: string[];
  uniqueValues: Record<string, string[]>;
  mappedColumns: Record<string, string | null>;
  processedData: any[];
  participantRatios: any;
  ageGroups: any;
  groupSettings: any;
  generatedGroups: any[];
  participantPairs: Set<string>;
  maleValues: string[];
  femaleValues: string[];
  groupLeaderValues: string[];
  targetAgeRanges: { from: string; to: string; name: string }[];
  setFile: (file: File) => void;
  setHeaders: (headers: string[]) => void;
  setUniqueValues: (uniqueValues: Record<string, string[]>) => void;
  setMappedColumns: (mappedColumns: Record<string, string | null>) => void;
  setProcessedData: (processedData: any[]) => void;
  setParticipantRatios: (participantRatios: any) => void;
  setAgeGroups: (ageGroups: any) => void;
  setGroupSettings: (groupSettings: any) => void;
  setGeneratedGroups: (generatedGroups: any[]) => void;
  setParticipantPairs: (participantPairs: Set<string>) => void;
  setMaleValues: (maleValues: string[]) => void;
  setFemaleValues: (femaleValues: string[]) => void;
  setGroupLeaderValues: (groupLeaderValues: string[]) => void;
  setTargetAgeRanges: (targetAgeRanges: { from: string; to: string; name: string }[]) => void;
}

export const useStore = create<AppState>((set) => ({
  file: null,
  headers: [],
  uniqueValues: {},
  mappedColumns: {
    id: null,
    gender: null,
    firstName: null,
    lastName: null,
    age: null,
    email: null,
    targetAge: null,
    isGroupLeader: null,
  },
  processedData: [],
  participantRatios: null,
  ageGroups: null,
  groupSettings: {
    groupSize: 0,
    minLeaders: 0,
    rounds: 1,
    shufflePolicy: 'random',
    balanceGenders: false,
    splitByTargetAge: false,
  },
  generatedGroups: [],
  participantPairs: new Set(),
  maleValues: [],
  femaleValues: [],
  groupLeaderValues: [],
  targetAgeRanges: [],
  setFile: (file) => set({ file }),
  setHeaders: (headers) => set({ headers }),
  setUniqueValues: (uniqueValues) => set({ uniqueValues }),
  setMappedColumns: (mappedColumns) => set(state => ({ mappedColumns: { ...state.mappedColumns, ...mappedColumns } })),
  setProcessedData: (processedData) => set({ processedData }),
  setParticipantRatios: (participantRatios) => set({ participantRatios }),
  setAgeGroups: (ageGroups) => set({ ageGroups }),
  setGroupSettings: (groupSettings) => set(state => ({ groupSettings: { ...state.groupSettings, ...groupSettings } })),
  setGeneratedGroups: (generatedGroups) => set({ generatedGroups }),
  setParticipantPairs: (participantPairs) => set({ participantPairs }),
  setMaleValues: (maleValues) => set({ maleValues }),
  setFemaleValues: (femaleValues) => set({ femaleValues }),
  setGroupLeaderValues: (groupLeaderValues) => set({ groupLeaderValues }),
  setTargetAgeRanges: (targetAgeRanges) => set({ targetAgeRanges }),
}));
