import type { Group, Participant, TargetAgeRange } from "../../../types";

export function getBestParticipant(
  currentGroup: Group,
  remainingNonLeaders: Participant[],
  balanceGenders: boolean,
  splitByTargetAge: boolean,
  shufflePolicy: string,
  maleValues: string[],
  femaleValues: string[],
  pastGroupmates: Record<string, Set<string>>,
  groupSize: number,
  targetAgeRanges: { from: string; to: string; name: string }[],
  maleRatio: number,
): Participant | null {
  if (remainingNonLeaders.length === 0) return null;

  let candidates = [...remainingNonLeaders];

  if (splitByTargetAge) {
    const currentGroupAverageAge = getAverageAge(currentGroup);
    const suitableCandidates = candidates.filter((p: Participant) => {
      const targetAgeRange = targetAgeRanges.find(range => range.name === p.targetAge);
      if (targetAgeRange) {
        const minAge = parseInt(targetAgeRange.from);
        const maxAge = parseInt(targetAgeRange.to);
        return currentGroupAverageAge >= minAge && currentGroupAverageAge <= maxAge;
      }
      return false;
    });
    if (suitableCandidates.length > 0) {
      candidates = suitableCandidates;
    }
  }

  if (balanceGenders) {
    const currentMaleCount = currentGroup.participants.filter((p: Participant) => maleValues.includes(p.gender)).length;
    const currentFemaleCount = currentGroup.participants.filter((p: Participant) => femaleValues.includes(p.gender)).length;

    const idealMaleCount = Math.round(groupSize * maleRatio);
    const idealFemaleCount = groupSize - idealMaleCount;

    let preferredGender: string | null = null;
    if (currentMaleCount < idealMaleCount && currentFemaleCount < idealFemaleCount) {
      const malesInRemaining = candidates.filter((p: Participant) => maleValues.includes(p.gender)).length;
      const femalesInRemaining = candidates.filter((p: Participant) => femaleValues.includes(p.gender)).length;
      if (malesInRemaining > 0 && femalesInRemaining > 0) {
        preferredGender = (malesInRemaining <= femalesInRemaining) ? 'male' : 'female';
      } else if (malesInRemaining > 0) {
        preferredGender = 'male';
      } else if (femalesInRemaining > 0) {
        preferredGender = 'female';
      }
    } else if (currentMaleCount < idealMaleCount) {
      preferredGender = 'male';
    } else if (currentFemaleCount < idealFemaleCount) {
      preferredGender = 'female';
    }

    if (preferredGender) {
      const genderCandidates = candidates.filter((p: Participant) =>
        (preferredGender === 'male' && maleValues.includes(p.gender)) ||
        (preferredGender === 'female' && femaleValues.includes(p.gender))
      );
      if (genderCandidates.length > 0) {
        candidates = genderCandidates;
      } else {
        // @TODO Shouldn't we use the candidates that got filtered out in the splitByTargetAge block?
        candidates = remainingNonLeaders;
      }
    }
  }

  if (shufflePolicy === 'unique') {
    return candidates.sort((a: Participant, b: Participant) => {
      let aRepeatedGroupmateCount = 0
      let bRepeatedGroupmateCount = 0
      for (const groupmember of currentGroup.participants) {
        if (pastGroupmates[a.id]?.has(groupmember.id)) {
          ++aRepeatedGroupmateCount
        }
        if (pastGroupmates[b.id]?.has(groupmember.id)) {
          ++bRepeatedGroupmateCount
        }
      }
      return aRepeatedGroupmateCount - bRepeatedGroupmateCount;
    })[0];
  } else {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
};

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
    return totalRepeatedGroupmateCount + (participant.statistics?.repeatedGroupmateCount || 0);
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

export function getAverageAge (group: Group) {
  if (group.participants.length === 0) {
    return 0
  }
  const totalAge = group.participants.reduce((sum: number, p: Participant) => sum + parseInt(p.age, 10), 0);
  return totalAge / group.participants.length;
};