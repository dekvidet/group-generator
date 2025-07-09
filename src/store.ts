
import { create } from 'zustand';

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  age: number;
  email: string;
  isGroupLeader: boolean;
  groupmateRedundancy?: number;
  ageRedundancy?: number;
}

interface Group {
  id: string;
  participants: Participant[];
}

interface Round extends Array<Group> {}

interface AppState {
  file: File | null;
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
  setFile: (file: File) => void;
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
}

export const useStore = create<AppState>((set, get) => ({
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
  pastGroupmates: {},
  setFile: (file) => set({ file }),
  setHeaders: (headers) => set({ headers }),
  setUniqueValues: (uniqueValues) => set({ uniqueValues }),
  setMappedColumns: (mappedColumns) => set(state => ({ mappedColumns: { ...state.mappedColumns, ...mappedColumns } })),
  setProcessedData: (processedData) => set({ processedData }),
  setParticipantRatios: (participantRatios) => set({ participantRatios }),
  setAgeGroups: (ageGroups) => set({ ageGroups }),
  setGroupSettings: (groupSettings) => set(state => ({ groupSettings: { ...state.groupSettings, ...groupSettings } })),
  setGeneratedGroups: (newGeneratedGroups: Round[]) => {
    const { pastGroupmates, groupSettings, targetAgeRanges } = get();
    const updatedPastGroupmates = { ...pastGroupmates };
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

          let ageRedundancy = 0;
          if (groupSettings.splitByTargetAge) {
            const participantTargetAgeRange = targetAgeRanges.find(range => range.name === participant.targetAge);
            if (participantTargetAgeRange) {
              const minAge = parseInt(participantTargetAgeRange.from);
              const maxAge = parseInt(participantTargetAgeRange.to);

              group.participants.forEach(otherParticipant => {
                if (participant.id !== otherParticipant.id) {
                  const otherParticipantAge = parseInt(otherParticipant.age);
                  if (otherParticipantAge < minAge || otherParticipantAge > maxAge) {
                    ageRedundancy++;
                  }
                }
              });
            }
          }
          return { ...participant, groupmateRedundancy: redundancy, ageRedundancy };
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
}));
