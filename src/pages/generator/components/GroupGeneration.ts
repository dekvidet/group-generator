import type { Group, Participant, TargetAgeRange } from '../../../types';

export type MeetingCounts = Record<string, Map<string, number>>;

export interface OptimizationSettings {
  groupSize: number;
  rounds: number;
  minLeaders: number;
  balanceGenders: boolean;
  splitByTargetAge: boolean;
  shufflePolicy: string;
  compulsoryGroupLeader: boolean;
  keepSiblingsApart: boolean;
  optimizationSeed: number;
}

interface Objective {
  values: number[];
}

export interface OptimizationResult {
  rounds: Participant[][][];
  promotedLeaderIds: string[];
}

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function familyOf(participant: Participant): string | null {
  const familyName = participant.familyName?.trim();
  return familyName ? familyName.toLocaleLowerCase() : null;
}

function canJoinFamily(participant: Participant, group: Participant[], keepSiblingsApart: boolean, ignoredId?: string): boolean {
  if (!keepSiblingsApart) return true;
  const family = familyOf(participant);
  if (!family) return true;
  return !group.some(member => member.id !== ignoredId && familyOf(member) === family);
}

function exactGroupSizes(participantCount: number, maximumSize: number): number[] {
  const groupCount = Math.ceil(participantCount / maximumSize);
  const smallerSize = Math.floor(participantCount / groupCount);
  const largerGroupCount = participantCount % groupCount;
  return Array.from({ length: groupCount }, (_, index) => index < largerGroupCount ? smallerSize + 1 : smallerSize);
}

function numericAge(participant: Participant): number | null {
  const age = Number.parseInt(participant.age, 10);
  return Number.isFinite(age) ? age : null;
}

function targetRange(participant: Participant, ranges: TargetAgeRange[]): { low: number; high: number } | null {
  const range = ranges.find(item => item.name === participant.targetAge);
  if (!range) return null;
  const low = Number.parseInt(range.from, 10);
  const high = Number.parseInt(range.to, 10);
  return Number.isFinite(low) && Number.isFinite(high) && low <= high ? { low, high } : null;
}

export function calculatePairAgeSatisfaction(participant: Participant, groupmate: Participant, ranges: TargetAgeRange[]): number | null {
  const range = targetRange(participant, ranges);
  const age = numericAge(groupmate);
  if (!range || age === null) return null;
  const distance = age < range.low ? range.low - age : age > range.high ? age - range.high : 0;
  return 1 / (1 + distance);
}

export function calculateParticipantAgeSatisfaction(participant: Participant, group: Pick<Group, 'participants'>, ranges: TargetAgeRange[]): number | null {
  if (!targetRange(participant, ranges)) return null;
  const scores = group.participants
    .filter(groupmate => groupmate.id !== participant.id)
    .map(groupmate => calculatePairAgeSatisfaction(participant, groupmate, ranges))
    .filter((score): score is number => score !== null);
  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function genderError(group: Participant[], maleValues: string[], femaleValues: string[], maleRatio: number): number {
  if (!Number.isFinite(maleRatio)) return 0;
  const maleCount = group.filter(participant => maleValues.includes(participant.gender)).length;
  const femaleCount = group.filter(participant => femaleValues.includes(participant.gender)).length;
  const classifiedCount = maleCount + femaleCount;
  return Math.abs(maleCount - classifiedCount * maleRatio) + Math.abs(femaleCount - classifiedCount * (1 - maleRatio));
}

function agePairCost(participant: Participant, group: Participant[], ranges: TargetAgeRange[]): number {
  let cost = 0;
  for (const groupmate of group) {
    const candidateScore = calculatePairAgeSatisfaction(participant, groupmate, ranges);
    const memberScore = calculatePairAgeSatisfaction(groupmate, participant, ranges);
    if (candidateScore !== null) cost += 1 - candidateScore;
    if (memberScore !== null) cost += 1 - memberScore;
  }
  return cost;
}

function pairKey(firstId: string, secondId: string): string {
  return firstId < secondId ? `${firstId}\u0000${secondId}` : `${secondId}\u0000${firstId}`;
}

function compareValues(first: number[], second: number[]): number {
  for (let index = 0; index < Math.max(first.length, second.length); index++) {
    const difference = (first[index] ?? 0) - (second[index] ?? 0);
    if (Math.abs(difference) > 1e-9) return difference;
  }
  return 0;
}

function evaluateSolution(
  rounds: Participant[][][],
  settings: OptimizationSettings,
  maleValues: string[],
  femaleValues: string[],
  ranges: TargetAgeRange[],
): Objective {
  const classifiedCount = rounds[0]?.flat().filter(participant => maleValues.includes(participant.gender) || femaleValues.includes(participant.gender)).length ?? 0;
  const maleCount = rounds[0]?.flat().filter(participant => maleValues.includes(participant.gender)).length ?? 0;
  const maleRatio = classifiedCount > 0 ? maleCount / classifiedCount : Number.NaN;
  const genderErrors: number[] = [];
  const ageDissatisfaction: number[] = [];
  const meetings = new Map<string, number>();

  for (const round of rounds) {
    round.forEach((group) => {
      if (settings.balanceGenders) genderErrors.push(genderError(group, maleValues, femaleValues, maleRatio));
      if (settings.splitByTargetAge) {
        for (const participant of group) {
          const satisfaction = calculateParticipantAgeSatisfaction(participant, { participants: group as Group['participants'] }, ranges);
          if (satisfaction !== null) ageDissatisfaction.push(1 - satisfaction);
        }
      }
      for (let first = 0; first < group.length; first++) {
        for (let second = first + 1; second < group.length; second++) {
          const key = pairKey(group[first].id, group[second].id);
          meetings.set(key, (meetings.get(key) ?? 0) + 1);
        }
      }
    });
  }

  let repeatCost = 0;
  let worstRepeat = 0;
  if (settings.shufflePolicy === 'unique') {
    for (const count of meetings.values()) {
      repeatCost += count * (count - 1) / 2;
      worstRepeat = Math.max(worstRepeat, count - 1);
    }
  }

  return {
    values: [
      settings.balanceGenders ? Math.max(0, ...genderErrors) : 0,
      settings.balanceGenders ? genderErrors.reduce((sum, value) => sum + value, 0) : 0,
      settings.splitByTargetAge ? Math.max(0, ...ageDissatisfaction) : 0,
      settings.splitByTargetAge ? ageDissatisfaction.reduce((sum, value) => sum + value, 0) : 0,
      worstRepeat,
      repeatCost,
    ],
  };
}

function assignLeaders(
  leaders: Participant[],
  sizes: number[],
  requiredPerGroup: number,
  keepSiblingsApart: boolean,
  random: () => number,
): Participant[][] | null {
  for (let attempt = 0; attempt < 100; attempt++) {
    const groups = sizes.map(() => [] as Participant[]);
    const remaining = shuffled(leaders, random).sort((first, second) => {
      const firstFamily = familyOf(first);
      const secondFamily = familyOf(second);
      if (!firstFamily || !secondFamily) return 0;
      const firstCount = leaders.filter(leader => familyOf(leader) === firstFamily).length;
      const secondCount = leaders.filter(leader => familyOf(leader) === secondFamily).length;
      return secondCount - firstCount;
    });
    let failed = false;

    while (remaining.length > 0) {
      const leader = remaining.shift() as Participant;
      let candidates = groups
        .map((group, index) => ({ group, index }))
        .filter(({ group, index }) => group.length < sizes[index] && canJoinFamily(leader, group, keepSiblingsApart));
      if (requiredPerGroup > 0 && candidates.some(({ group }) => group.length < requiredPerGroup)) {
        candidates = candidates.filter(({ group }) => group.length < requiredPerGroup);
      }
      if (candidates.length === 0) {
        failed = true;
        break;
      }
      const minimumLeaderCount = Math.min(...candidates.map(({ group }) => group.length));
      const best = candidates.filter(({ group }) => group.length === minimumLeaderCount);
      const selected = best[Math.floor(random() * best.length)];
      selected.group.push(leader);
    }

    if (!failed && groups.every(group => group.length >= requiredPerGroup)) return groups;
  }
  return null;
}

function constructRounds(
  participants: Participant[],
  leaderGroups: Participant[][],
  sizes: number[],
  settings: OptimizationSettings,
  maleValues: string[],
  femaleValues: string[],
  ranges: TargetAgeRange[],
  random: () => number,
): Participant[][][] | null {
  const leaderIds = new Set(leaderGroups.flat().map(participant => participant.id));
  const nonLeaders = participants.filter(participant => !leaderIds.has(participant.id));
  const classifiedCount = participants.filter(participant => maleValues.includes(participant.gender) || femaleValues.includes(participant.gender)).length;
  const maleRatio = classifiedCount > 0
    ? participants.filter(participant => maleValues.includes(participant.gender)).length / classifiedCount
    : Number.NaN;

  for (let constructionAttempt = 0; constructionAttempt < 40; constructionAttempt++) {
    const result: Participant[][][] = [];
    const priorMeetings = new Map<string, number>();
    let failed = false;

    for (let roundIndex = 0; roundIndex < settings.rounds; roundIndex++) {
      const groups = leaderGroups.map(group => [...group]);
      const familyFrequency = new Map<string, number>();
      for (const participant of nonLeaders) {
        const family = familyOf(participant);
        if (family) familyFrequency.set(family, (familyFrequency.get(family) ?? 0) + 1);
      }
      const order = shuffled(nonLeaders, random).sort((first, second) =>
        (familyFrequency.get(familyOf(second) ?? '') ?? 0) - (familyFrequency.get(familyOf(first) ?? '') ?? 0)
      );

      for (const participant of order) {
        const candidates = groups
          .map((group, groupIndex) => ({ group, groupIndex }))
          .filter(({ group, groupIndex }) => group.length < sizes[groupIndex] && canJoinFamily(participant, group, settings.keepSiblingsApart));
        if (candidates.length === 0) {
          failed = true;
          break;
        }

        const scored = candidates.map(candidate => {
          const beforeGender = genderError(candidate.group, maleValues, femaleValues, maleRatio);
          const afterGender = genderError([...candidate.group, participant], maleValues, femaleValues, maleRatio);
          const repeatCost = candidate.group.reduce((sum, member) => sum + (priorMeetings.get(pairKey(participant.id, member.id)) ?? 0), 0);
          return {
            ...candidate,
            score: [
              settings.balanceGenders ? afterGender - beforeGender : 0,
              settings.splitByTargetAge ? agePairCost(participant, candidate.group, ranges) : 0,
              settings.shufflePolicy === 'unique' ? repeatCost : 0,
              candidate.group.length / sizes[candidate.groupIndex],
            ],
          };
        }).sort((first, second) => compareValues(first.score, second.score));
        const bestScore = scored[0].score;
        const tied = scored.filter(candidate => compareValues(candidate.score, bestScore) === 0);
        tied[Math.floor(random() * tied.length)].group.push(participant);
      }

      if (failed || groups.some((group, groupIndex) => group.length !== sizes[groupIndex])) {
        failed = true;
        break;
      }

      result.push(groups);
      for (const group of groups) {
        for (let first = 0; first < group.length; first++) {
          for (let second = first + 1; second < group.length; second++) {
            const key = pairKey(group[first].id, group[second].id);
            priorMeetings.set(key, (priorMeetings.get(key) ?? 0) + 1);
          }
        }
      }
    }
    if (!failed) return result;
  }
  return null;
}

function improveWithSwaps(
  rounds: Participant[][][],
  settings: OptimizationSettings,
  maleValues: string[],
  femaleValues: string[],
  ranges: TargetAgeRange[],
  random: () => number,
): Participant[][][] {
  let objective = evaluateSolution(rounds, settings, maleValues, femaleValues, ranges);
  const iterations = Math.min(800, Math.max(200, rounds.flat(2).length));

  for (let iteration = 0; iteration < iterations; iteration++) {
    const round = rounds[Math.floor(random() * rounds.length)];
    const firstGroupIndex = Math.floor(random() * round.length);
    let secondGroupIndex = Math.floor(random() * round.length);
    if (firstGroupIndex === secondGroupIndex) secondGroupIndex = (secondGroupIndex + 1) % round.length;
    const firstGroup = round[firstGroupIndex];
    const secondGroup = round[secondGroupIndex];
    const firstMovable = firstGroup.filter(participant => !participant.isGroupLeader);
    const secondMovable = secondGroup.filter(participant => !participant.isGroupLeader);
    if (firstMovable.length === 0 || secondMovable.length === 0) continue;
    const first = firstMovable[Math.floor(random() * firstMovable.length)];
    const second = secondMovable[Math.floor(random() * secondMovable.length)];
    if (!canJoinFamily(first, secondGroup, settings.keepSiblingsApart, second.id) || !canJoinFamily(second, firstGroup, settings.keepSiblingsApart, first.id)) continue;

    const firstIndex = firstGroup.findIndex(participant => participant.id === first.id);
    const secondIndex = secondGroup.findIndex(participant => participant.id === second.id);
    firstGroup[firstIndex] = second;
    secondGroup[secondIndex] = first;
    const candidateObjective = evaluateSolution(rounds, settings, maleValues, femaleValues, ranges);
    if (compareValues(candidateObjective.values, objective.values) < 0) {
      objective = candidateObjective;
    } else {
      firstGroup[firstIndex] = first;
      secondGroup[secondIndex] = second;
    }
  }
  return rounds;
}

export function optimizeGroups(
  sourceParticipants: Participant[],
  settings: OptimizationSettings,
  maleValues: string[],
  femaleValues: string[],
  ranges: TargetAgeRange[],
): OptimizationResult {
  if (!Number.isInteger(settings.groupSize) || settings.groupSize <= 0) throw new Error('Group size must be a positive integer.');
  if (!Number.isInteger(settings.rounds) || settings.rounds < 0) throw new Error('Number of rounds must be a non-negative integer.');
  if (!Number.isInteger(settings.minLeaders) || settings.minLeaders < 0) throw new Error('Minimum leaders must be a non-negative integer.');
  if (sourceParticipants.length === 0 || settings.rounds === 0) return { rounds: [], promotedLeaderIds: [] };
  if (settings.balanceGenders && !sourceParticipants.some(participant => maleValues.includes(participant.gender) || femaleValues.includes(participant.gender))) {
    throw new Error('Gender balancing requires at least one selected male or female value.');
  }
  if (settings.splitByTargetAge) {
    if (sourceParticipants.some(participant => numericAge(participant) === null)) {
      throw new Error('Age optimization requires a valid integer age for every participant.');
    }
    const usedRangeNames = new Set(sourceParticipants.map(participant => participant.targetAge).filter(Boolean));
    for (const range of ranges.filter(item => usedRangeNames.has(item.name))) {
      const low = Number.parseInt(range.from, 10);
      const high = Number.parseInt(range.to, 10);
      if (!Number.isFinite(low) || !Number.isFinite(high) || low > high) {
        throw new Error(`Preferred age range "${range.name}" is invalid.`);
      }
    }
  }

  const sizes = exactGroupSizes(sourceParticipants.length, settings.groupSize);
  const groupCount = sizes.length;
  if (settings.compulsoryGroupLeader && settings.minLeaders > Math.min(...sizes)) {
    throw new Error('The requested leader count is larger than at least one group.');
  }
  if (settings.keepSiblingsApart) {
    const familyCounts = new Map<string, number>();
    for (const participant of sourceParticipants) {
      const family = familyOf(participant);
      if (family) familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
    }
    if ([...familyCounts.values()].some(count => count > groupCount)) {
      throw new Error('Sibling separation is impossible: one family has more participants than there are groups.');
    }
  }

  const random = createRandom(Number.isFinite(settings.optimizationSeed) ? settings.optimizationSeed : 1);
  const participants = sourceParticipants.map(participant => ({
    ...participant,
    leaderPreference: participant.leaderPreference ?? (participant.isGroupLeader ? 'voluntary' : 'indifferent'),
  }));
  const leaders = participants.filter(participant => participant.isGroupLeader);
  const promotedLeaderIds: string[] = [];
  const requiredLeaderCount = settings.compulsoryGroupLeader ? groupCount * settings.minLeaders : 0;
  if (leaders.length < requiredLeaderCount) {
    const candidates = [
      ...shuffled(participants.filter(participant => !participant.isGroupLeader && participant.leaderPreference === 'indifferent'), random),
      ...shuffled(participants.filter(participant => !participant.isGroupLeader && participant.leaderPreference === 'no'), random),
    ];
    while (leaders.length < requiredLeaderCount && candidates.length > 0) {
      const promoted = candidates.shift() as Participant;
      promoted.isGroupLeader = true;
      promotedLeaderIds.push(promoted.id);
      leaders.push(promoted);
    }
  }
  if (leaders.length < requiredLeaderCount) throw new Error('There are not enough participants to satisfy the leader requirement.');

  let bestRounds: Participant[][][] | null = null;
  let bestObjective: Objective | null = null;
  const starts = sourceParticipants.length > 200 ? 3 : 6;
  for (let start = 0; start < starts; start++) {
    const leaderGroups = assignLeaders(leaders, sizes, settings.compulsoryGroupLeader ? settings.minLeaders : 0, settings.keepSiblingsApart, random);
    if (!leaderGroups) continue;
    const candidate = constructRounds(participants, leaderGroups, sizes, settings, maleValues, femaleValues, ranges, random);
    if (!candidate) continue;
    improveWithSwaps(candidate, settings, maleValues, femaleValues, ranges, random);
    const objective = evaluateSolution(candidate, settings, maleValues, femaleValues, ranges);
    if (!bestObjective || compareValues(objective.values, bestObjective.values) < 0) {
      bestRounds = candidate.map(round => round.map(group => [...group]));
      bestObjective = objective;
    }
  }
  if (!bestRounds) throw new Error('No feasible grouping was found. Try disabling sibling separation or changing the constraints.');
  return { rounds: bestRounds, promotedLeaderIds };
}

export function calculateRepeatedGroupmateCount(group: Group, participant: Participant, priorMeetings: MeetingCounts): number {
  return group.participants.reduce((count, groupmate) =>
    participant.id !== groupmate.id && (priorMeetings[participant.id]?.get(groupmate.id) ?? 0) > 0 ? count + 1 : count, 0);
}

export function calculateUnmetTargetAgeGroupmateCount(group: Group, participant: Participant, ranges: TargetAgeRange[]): number {
  return group.participants.reduce((count, groupmate) => {
    if (participant.id === groupmate.id) return count;
    const score = calculatePairAgeSatisfaction(participant, groupmate, ranges);
    return score !== null && score < 1 ? count + 1 : count;
  }, 0);
}

export function calculateGroupmateRedundancyScore(group: Group, priorMeetings: MeetingCounts): number {
  if (group.participants.length <= 1) return 0;
  let pairCount = 0;
  let repeatCost = 0;
  for (let first = 0; first < group.participants.length; first++) {
    for (let second = first + 1; second < group.participants.length; second++) {
      pairCount++;
      repeatCost += priorMeetings[group.participants[first].id]?.get(group.participants[second].id) ?? 0;
    }
  }
  return 1 / (1 + repeatCost / pairCount);
}

export function calculateGenderRatioScore(group: Group, maleValues: string[], femaleValues: string[], totalMaleCount: number, totalFemaleCount: number): number {
  if (group.participants.length === 0) return 0;
  const classifiedCount = totalMaleCount + totalFemaleCount;
  if (classifiedCount === 0) return 1;
  const groupClassifiedCount = group.participants.filter(participant => maleValues.includes(participant.gender) || femaleValues.includes(participant.gender)).length;
  if (groupClassifiedCount === 0) return 1;
  const error = genderError(group.participants, maleValues, femaleValues, totalMaleCount / classifiedCount);
  return Math.max(0, 1 - error / (2 * groupClassifiedCount));
}

export function calculateTargetAgeScore(group: Group, ranges: TargetAgeRange[]): number {
  const scores = group.participants
    .map(participant => calculateParticipantAgeSatisfaction(participant, group, ranges))
    .filter((score): score is number => score !== null);
  if (scores.length === 0) return 1;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function getAverageAge(group: Pick<Group, 'participants'>) {
  const ages = group.participants.map(numericAge).filter((age): age is number => age !== null);
  if (ages.length === 0) return 0;
  return ages.reduce((sum, age) => sum + age, 0) / ages.length;
}
