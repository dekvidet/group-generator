
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Round, TargetAgeRange } from './types';


interface AppState {
  //CsvUploader
  generatorFile: File | null;
  presenterFile: File | undefined;
  headers: string[];
  uniqueValues: Record<string, string[]>;

  //CsvProcessor
  mappedColumns: Record<string, string | null>;
  maleValues: string[];
  femaleValues: string[];
  targetAgeRanges: TargetAgeRange[];
  groupLeaderValues: string[];
  processedData: any[];
  
  //Statistics
  generatedIdCount: number;
  duplicateRowCount: number;
  ageGroups: any;
  participantRatios: any;
  
  //GroupGenerator
  groupSettings: any;
  generatedGroups: Round[];
  displayColumns: string[];
  
  participantPairs: Set<string>;
  
  setGeneratorFile: (file: File) => void;
  setPresenterFile: (file: File | undefined) => void;
  setGeneratedIdCount: (count: number) => void;
  setDuplicateRowCount: (count: number) => void;
  setHeaders: (headers: string[]) => void;
  setUniqueValues: (uniqueValues: Record<string, string[]>) => void;
  setMappedColumns: (mappedColumns: Record<string, string | null>) => void;
  setProcessedData: (processedData: any[]) => void;
  setParticipantRatios: (participantRatios: any) => void;
  setAgeGroups: (ageGroups: any) => void;
  setGroupSettings: (groupSettings: any) => void;
  setGeneratedGroups: (generatedGroups: Round[]) => void;
  setParticipantPairs: (participantPairs: Set<string>) => void;
  setMaleValues: (maleValues: string[]) => void;
  setFemaleValues: (femaleValues: string[]) => void;
  setGroupLeaderValues: (groupLeaderValues: string[]) => void;
  setTargetAgeRanges: (targetAgeRanges: { from: string; to: string; name: string }[]) => void;
  setDisplayColumns: (displayColumns: string[]) => void;
  reset: () => void;
}

export const useStore = create<AppState>()(devtools((set) => ({
  generatorFile: null,
  presenterFile: undefined,
  headers: [],
  uniqueValues: {},
  mappedColumns: {
    id: null,
    gender: null,
    age: null,
    targetAge: null,
    isGroupLeader: null,
  },
  processedData: [],
  participantRatios: null,
  ageGroups: null,
  groupSettings: {
    groupSize: 5,
    minLeaders: 0,
    rounds: 3,
    shufflePolicy: 'unique',
    balanceGenders: true,
    splitByTargetAge: true,
    compulsoryGroupLeader: true,
  },
  generatedGroups: [],
  participantPairs: new Set(),
  maleValues: [],
  femaleValues: [],
  groupLeaderValues: [],
  targetAgeRanges: [],
  displayColumns: [],
  generatedIdCount: 0,
  duplicateRowCount: 0,
  setGeneratorFile: (file) => set({ generatorFile: file }),
  setPresenterFile: (file) => set({ presenterFile: file }),
  setGeneratedIdCount: (count) => set({ generatedIdCount: count }),
  setDuplicateRowCount: (count) => set({ duplicateRowCount: count }),
  setHeaders: (headers) => set({ headers }),
  setUniqueValues: (uniqueValues) => set({ uniqueValues }),
  setMappedColumns: (mappedColumns) => set(state => ({ mappedColumns: { ...state.mappedColumns, ...mappedColumns } })),
  setProcessedData: (processedData) => set({ processedData }),
  setParticipantRatios: (participantRatios) => set({ participantRatios }),
  setAgeGroups: (ageGroups) => set({ ageGroups }),
  setGroupSettings: (groupSettings) => set(state => ({ groupSettings: { ...state.groupSettings, ...groupSettings } })),
  setGeneratedGroups: (generatedGroups: Round[]) => set({ generatedGroups }),
  setParticipantPairs: (participantPairs) => set({ participantPairs }),
  setMaleValues: (maleValues) => set({ maleValues }),
  setFemaleValues: (femaleValues) => set({ femaleValues }),
  setGroupLeaderValues: (groupLeaderValues) => set({ groupLeaderValues }),
  setTargetAgeRanges: (targetAgeRanges) => set({ targetAgeRanges }),
  setDisplayColumns: (displayColumns) => set({ displayColumns }),
  reset: () => set({
    generatorFile: null,
    presenterFile: undefined,
    headers: [],
    uniqueValues: {},
    mappedColumns: {
      id: null,
      gender: null,
      age: null,
      targetAge: null,
      isGroupLeader: null,
    },
    processedData: [],
    participantRatios: null,
    ageGroups: null,
    groupSettings: {
      groupSize: 5,
      minLeaders: 0,
      rounds: 3,
      shufflePolicy: 'unique',
      balanceGenders: true,
      splitByTargetAge: true,
      compulsoryGroupLeader: false,
    },
    generatedGroups: [],
    participantPairs: new Set(),
    maleValues: [],
    femaleValues: [],
    groupLeaderValues: [],
    targetAgeRanges: [],
    displayColumns: [],
  }),
}), { name: 'group-generator-storage' }))
