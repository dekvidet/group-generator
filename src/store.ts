
import { create } from 'zustand';

interface Participant {
  id: string;
  gender: string;
  age: string;
  isGroupLeader: boolean;
  groupmateRedundancy?: number;
  unmetTargetAge?: number;
  [key: string]: any; // Allow for arbitrary additional properties
}

interface Group {
  id: number;
  participants: Participant[];
}

interface Round extends Array<Group> {}

interface AppState {
  generatorFile: File | null;
  presenterFile: File | undefined;
  headers: string[];
  uniqueValues: Record<string, string[]>;
  mappedColumns: Record<string, string | null>;
  processedData: any[];
  participantRatios: any;
  ageGroups: any;
  groupSettings: any;
  generatedGroups: Round[];
  participantPairs: Set<string>;
  maleValues: string[];
  femaleValues: string[];
  groupLeaderValues: string[];
  targetAgeRanges: { from: string; to: string; name: string }[];
  pastGroupmates: Record<string, Set<string>>;
  pastUnmetTargetAge: Record<string, number>;
  displayColumns: string[];
  generatedIdCount: number;
  duplicateRowCount: number;
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

export const useStore = create<AppState>((set, get) => ({
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
    groupSize: 2,
    minLeaders: 0,
    rounds: 1,
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
  pastGroupmates: {},
  pastUnmetTargetAge: {},
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
  setGeneratedGroups: (newGeneratedGroups: Round[]) => {
    const { pastGroupmates, groupSettings, targetAgeRanges, pastUnmetTargetAge } = get();
    const updatedPastGroupmates = { ...pastGroupmates };
    const updatedPastUnmetTargetAge = { ...pastUnmetTargetAge };
    const groupsWithRedundancy = newGeneratedGroups.map((round, roundIndex) => {
      return round.map(group => {
        const participantsWithRedundancy = group.participants.map(participant => {
          let redundancy = 0;
          if (roundIndex > 0) {
            const currentParticipantPastGroupmates = updatedPastGroupmates[participant.id] || new Set();
            group.participants.forEach(otherParticipant => {
              if (participant.id !== otherParticipant.id && currentParticipantPastGroupmates.has(otherParticipant.id)) {
                redundancy++;
              }
            });
          }

          let unmetTargetAge = 0;
          if (groupSettings.splitByTargetAge) {
            const participantTargetAgeRange = targetAgeRanges.find(range => range.name === participant.targetAge);
            if (participantTargetAgeRange) {
              const minAge = parseInt(participantTargetAgeRange.from);
              const maxAge = parseInt(participantTargetAgeRange.to);

              group.participants.forEach(otherParticipant => {
                if (participant.id !== otherParticipant.id) {
                  const otherParticipantAge = parseInt(otherParticipant.age);
                  if (otherParticipantAge < minAge || otherParticipantAge > maxAge) {
                    unmetTargetAge++;
                  }
                }
              });
            }
          }
          const previousUnmetTargetAge = updatedPastUnmetTargetAge[participant.id] || 0;
          updatedPastUnmetTargetAge[participant.id] = previousUnmetTargetAge + unmetTargetAge;
          return { ...participant, groupmateRedundancy: redundancy, unmetTargetAge: updatedPastUnmetTargetAge[participant.id] };
        });

        // Update pastGroupmates for all participants in the current group
        participantsWithRedundancy.forEach(participant => {
          if (!updatedPastGroupmates[participant.id]) {
            updatedPastGroupmates[participant.id] = new Set();
          }
          group.participants.forEach(otherParticipant => {
            if (participant.id !== otherParticipant.id) {
              updatedPastGroupmates[participant.id].add(otherParticipant.id);
            }
          });
        });
        return { ...group, participants: participantsWithRedundancy };
      });
    });
    set({ generatedGroups: groupsWithRedundancy, pastGroupmates: updatedPastGroupmates });
  },
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
      groupSize: 2,
      minLeaders: 0,
      rounds: 1,
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
    pastGroupmates: {},
    pastUnmetTargetAge: {},
    displayColumns: [],
  }),
}));
