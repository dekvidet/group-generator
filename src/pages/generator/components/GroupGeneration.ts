import type { Group, Participant, TargetAgeRange } from "../../../types";

export function calculateRepeatedGroupmateCount(group: Group, participant: Participant, pastGroupmates: Record<string, Set<string>>) {
  let repeatedGroupmateCount = 0;
  const currentParticipantPastGroupmates = pastGroupmates[participant.id] || new Set();
  group.participants.forEach(otherParticipant => {
    if (participant.id !== otherParticipant.id && currentParticipantPastGroupmates.has(otherParticipant.id)) {
      repeatedGroupmateCount++;
    }
  })
  return repeatedGroupmateCount
}

export function calculateUnmetTargetAgeGroupmateCount(group: Group, participant: Participant, targetAgeRanges: TargetAgeRange[]) {
  let unmetTargetAgeGroupmateCount = 0
  const participantTargetAgeRange = targetAgeRanges.find(range => range.name === participant.targetAge);
  if (participantTargetAgeRange) {
    const minAge = parseInt(participantTargetAgeRange.from);
    const maxAge = parseInt(participantTargetAgeRange.to);

    group.participants.forEach(otherParticipant => {
      if (participant.id !== otherParticipant.id) {
        const otherParticipantAge = parseInt(otherParticipant.age);
        if (otherParticipantAge < minAge || otherParticipantAge > maxAge) {
          unmetTargetAgeGroupmateCount++;
        }
      }
    });
  }
  return unmetTargetAgeGroupmateCount
}

/*
 * Calculate the success of pairing every participant with a new group member. 0 means everybody met with everybody before, 1 means everybody inside the group met the first time.
 */
export function calculateGroupmateRedundancyScore(group: Group): number {
  if (group.participants.length <= 1) {
    return 1 // No groupmates or only one participant, no redundancy
  }

  const totalRepeatedGroupmateCount = group.participants.reduce((totalRepeatedGroupmateCount, participant) => {
    return totalRepeatedGroupmateCount + (participant?.statistics?.repeatedGroupmateCount || 0);
  }, 0)

  const groupSize = group.participants.length
  const groupmatesPerGroupmember = groupSize - 1
  const maxRepeatedGroupmateCount = groupSize * groupmatesPerGroupmember;
  const percentageOfRepeatedGroupmatePairs = totalRepeatedGroupmateCount / maxRepeatedGroupmateCount
  return 1 - percentageOfRepeatedGroupmatePairs;
};


export function calculateGenderRatioScore(group: Group, maleValues: string[], femaleValues: string[], totalMaleCount: number, totalFemaleCount: number): number {
  if (group.participants.length === 0) return 0;

  const groupMaleCount = group.participants.filter(p => maleValues.includes(p.gender)).length;
  const groupFemaleCount = group.participants.filter(p => femaleValues.includes(p.gender)).length;

  const totalParticipants = totalMaleCount + totalFemaleCount;
  if (totalParticipants === 0) return 1; // No participants, perfect ratio

  const overallMaleRatio = totalMaleCount / totalParticipants;
  const overallFemaleRatio = totalFemaleCount / totalParticipants;

  const groupTotal = groupMaleCount + groupFemaleCount;
  if (groupTotal === 0) return 0; // No participants in group, cannot calculate ratio

  const groupMaleRatio = groupMaleCount / groupTotal;
  const groupFemaleRatio = groupFemaleCount / groupTotal;

  const maleRatioDifference = Math.abs(groupMaleRatio - overallMaleRatio);
  const femaleRatioDifference = Math.abs(groupFemaleRatio - overallFemaleRatio);

  // The closer the difference is to 0, the better. Max difference is 1.
  // So, 1 - difference gives a score where 1 is best and 0 is worst.
  return 1 - ((maleRatioDifference + femaleRatioDifference) / 2);
};

export function calculateTargetAgeScore(group: Group, targetAgeRanges: TargetAgeRange[]): number {
  if (group.participants.length === 0) return 0;

  let achievedCount = 0;
  group.participants.forEach(participant => {
    if (participant.targetAge) {
      const targetAgeRange = targetAgeRanges.find(range => range.name === participant.targetAge);
      if (targetAgeRange) {
        const minAge = parseInt(targetAgeRange.from);
        const maxAge = parseInt(targetAgeRange.to);
        const groupmatesMeetingTarget = group.participants.filter(p => {
          const age = parseInt(p.age);
          return p.id !== participant.id && age >= minAge && age <= maxAge;
        }).length;
        if (groupmatesMeetingTarget > 0) {
          achievedCount++;
        }
      }
    }
  });

  return achievedCount / group.participants.length;
};