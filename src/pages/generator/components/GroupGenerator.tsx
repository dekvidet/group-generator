
import React from 'react';
import { useStore } from '../../../store';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Button, Chip, ListItemText } from '@mui/material';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';

interface Participant {
  id: string;
  gender: string;
  age: string;
  isGroupLeader: boolean;
  targetAge?: string;
}

interface Statistics {
  genderRatioScore: number;
  targetAgeScore: number;
  groupmateRedundancyScore: number;
  totalScore: number;
}

interface Group {
  id: number;
  participants: Participant[];
  statistics?: Statistics;
}

const GroupGenerator: React.FC = () => {
  const { groupSettings, setGroupSettings, processedData, setGeneratedGroups, maleValues, femaleValues, targetAgeRanges, participantPairs, setParticipantPairs, generatedGroups, displayColumns, setDisplayColumns, headers } = useStore();
  const { t } = useTranslation();

  const handleChange = (field: string, value: any) => {
    setGroupSettings({ [field]: value });
  };

  const getAverageAge = (group: Group) => {
    if (group.participants.length === 0) return 0;
    const totalAge = group.participants.reduce((sum: number, p: Participant) => sum + parseInt(p.age), 0);
    return totalAge / group.participants.length;
  };

  const calculateGenderRatioScore = (group: Group, maleValues: string[], femaleValues: string[], totalMaleCount: number, totalFemaleCount: number): number => {
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

  const calculateTargetAgeScore = (group: Group): number => {
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

  const calculateGroupmateRedundancyScore = (group: Group, allParticipantPairs: Set<string>): number => {
    if (group.participants.length === 0) return 0;

    let nonRepeatingCount = 0;
    group.participants.forEach(participant => {
      let participantNonRepeatingCount = 0;
      for (let i = 0; i < group.participants.length; i++) {
        const groupmate = group.participants[i];
        if (participant.id !== groupmate.id) {
          const pairKey = `${Math.min(parseInt(participant.id), parseInt(groupmate.id))}-${Math.max(parseInt(participant.id), parseInt(groupmate.id))}`;
          if (!allParticipantPairs.has(pairKey)) {
            participantNonRepeatingCount++;
          }
        }
      }
      // If a participant has no groupmates (group size 1), or no non-repeating groupmates, their score for this metric is 0.
      // Otherwise, it's the ratio of non-repeating groupmates to total possible groupmates (group.participants.length - 1).
      if (group.participants.length > 1) {
        nonRepeatingCount += (participantNonRepeatingCount / (group.participants.length - 1));
      }
    });

    return nonRepeatingCount / group.participants.length;
  };

  const handleGenerateGroups = () => {
    const { groupSize, rounds, minLeaders, balanceGenders, splitByTargetAge, shufflePolicy, compulsoryGroupLeader } = groupSettings;
    let leaders = processedData.filter((p: Participant) => p.isGroupLeader);
    let nonLeaders = processedData.filter((p: Participant) => !p.isGroupLeader);

    // Compulsory group leader logic (global before rounds)
    if (compulsoryGroupLeader) {
      const numGroups = Math.ceil(processedData.length / groupSize);
      const requiredLeadersCount = numGroups * minLeaders;

      if (leaders.length < requiredLeadersCount) {
        const needed = requiredLeadersCount - leaders.length;
        for (let k = 0; k < needed; k++) {
          if (nonLeaders.length > 0) {
            const randomIndex = Math.floor(Math.random() * nonLeaders.length);
            const selectedLeader = { ...nonLeaders[randomIndex], isGroupLeader: true };
            leaders.push(selectedLeader);
            nonLeaders.splice(randomIndex, 1); // Remove from nonLeaders
          } else {
            break; // No more non-leaders to promote
          }
        }
      }
    }

    const newGeneratedGroups: Group[][] = [];
    const currentParticipantPairs = new Set<string>(participantPairs);

    for (let i = 0; i < rounds; i++) {
      const roundGroups: Group[] = [];
      const numGroups = Math.ceil(processedData.length / groupSize);

      // Initialize groups with leaders (fixed to group ID)
      for (let j = 0; j < numGroups; j++) {
        roundGroups.push({ id: j + 1, participants: [] });
      }

      // Distribute leaders based on their initial group ID (if round 0) or fixed assignment
      if (i === 0) {
        let leaderIndex = 0;
        for (let j = 0; j < minLeaders; j++) {
          for (let k = 0; k < numGroups; k++) {
            if (leaders[leaderIndex]) {
              roundGroups[k].participants.push(leaders[leaderIndex]);
              leaderIndex++;
            }
          }
        }
        while (leaderIndex < leaders.length) {
          for (let k = 0; k < numGroups; k++) {
            if (leaders[leaderIndex]) {
              roundGroups[k].participants.push(leaders[leaderIndex]);
              leaderIndex++;
            }
          }
        }
      } else {
        // For subsequent rounds, leaders stay in the same group ID
        // This assumes leaders were assigned to groups in round 0 and their group ID is stored
        // For now, I'll re-distribute them based on the initial logic for simplicity, but a more robust solution
        // would store their assigned group ID from round 0.
        let leaderIndex = 0;
        for (let j = 0; j < minLeaders; j++) {
          for (let k = 0; k < numGroups; k++) {
            if (leaders[leaderIndex]) {
              roundGroups[k].participants.push(leaders[leaderIndex]);
              leaderIndex++;
            }
          }
        }
        while (leaderIndex < leaders.length) {
          for (let k = 0; k < numGroups; k++) {
            if (leaders[leaderIndex]) {
              roundGroups[k].participants.push(leaders[leaderIndex]);
              leaderIndex++;
            }
          }
        }
      }

      let availableNonLeaders = [...nonLeaders];

      const getBestParticipant = (
        currentGroup: Group,
        remainingNonLeaders: Participant[],
        balanceGenders: boolean,
        splitByTargetAge: boolean,
        shufflePolicy: string,
        maleValues: string[],
        femaleValues: string[],
        currentParticipantPairs: Set<string>,
        groupSize: number,
        targetAgeRanges: { from: string; to: string; name: string }[]
      ): Participant | null => {
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

          const idealMaleCount = Math.ceil(groupSize / 2);
          const idealFemaleCount = Math.floor(groupSize / 2);

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
              candidates = remainingNonLeaders;
            }
          }
        }

        if (shufflePolicy === 'unique') {
          return candidates.sort((a: Participant, b: Participant) => {
            let aConflicts = 0;
            let bConflicts = 0;
            for (const existingParticipant of currentGroup.participants) {
              const pairKeyA = `${Math.min(parseInt(a.id), parseInt(existingParticipant.id))}-${Math.max(parseInt(a.id), parseInt(existingParticipant.id))}`;
              const pairKeyB = `${Math.min(parseInt(b.id), parseInt(existingParticipant.id))}-${Math.max(parseInt(b.id), parseInt(existingParticipant.id))}`;
              if (currentParticipantPairs.has(pairKeyA)) aConflicts++;
              if (currentParticipantPairs.has(pairKeyB)) bConflicts++;
            }
            return aConflicts - bConflicts;
          })[0];
        } else {
          return candidates[Math.floor(Math.random() * candidates.length)];
        }
      };

      while (availableNonLeaders.length > 0) {
        let assignedThisIteration = false;
        for (const group of roundGroups) {
          if (group.participants.length < groupSize) {
            const participantToAssign = getBestParticipant(
              group,
              availableNonLeaders,
              balanceGenders,
              splitByTargetAge,
              shufflePolicy,
              maleValues,
              femaleValues,
              currentParticipantPairs,
              groupSize,
              targetAgeRanges
            );

            if (participantToAssign) {
              group.participants.push(participantToAssign);
              availableNonLeaders = availableNonLeaders.filter(p => p.id !== participantToAssign.id);
              assignedThisIteration = true;
            }
          }
        }
        if (!assignedThisIteration && availableNonLeaders.length > 0) {
          break;
        }
      }

      // Update participant pairs for the next round
      roundGroups.forEach(group => {
        for (let k = 0; k < group.participants.length; k++) {
          for (let l = k + 1; l < group.participants.length; l++) {
            const p1 = group.participants[k].id;
            const p2 = group.participants[l].id;
            currentParticipantPairs.add(`${Math.min(parseInt(p1), parseInt(p2))}-${Math.max(parseInt(p1), parseInt(p2))}`);
          }
        }
      });

      // Calculate statistics for each group in the current round
      const totalMaleCount = processedData.filter(p => maleValues.includes(p.gender)).length;
      const totalFemaleCount = processedData.filter(p => femaleValues.includes(p.gender)).length;

      roundGroups.forEach(group => {
        const genderRatioScore = calculateGenderRatioScore(group, maleValues, femaleValues, totalMaleCount, totalFemaleCount);
        const targetAgeScore = calculateTargetAgeScore(group);
        const groupmateRedundancyScore = calculateGroupmateRedundancyScore(group, currentParticipantPairs);

        const totalScore = (genderRatioScore + targetAgeScore + groupmateRedundancyScore) / 3;

        group.statistics = {
          genderRatioScore,
          targetAgeScore,
          groupmateRedundancyScore,
          totalScore,
        };
      });

      newGeneratedGroups.push(roundGroups);
    }
    setGeneratedGroups(newGeneratedGroups);
    setParticipantPairs(currentParticipantPairs);
  };

  const handleDownload = () => {
    const wb = XLSX.utils.book_new();

    const ws_data: any[][] = [[]];
    displayColumns.forEach(col => ws_data[0].push(col));
    ws_data[0].push(t('groupGenerator.texts.groupLeaderColumn'));

    const maxRound = generatedGroups.length; // Total number of rounds
    for (let i = 0; i < maxRound; i++) {
      ws_data[0].push(t('groupGenerator.texts.roundHeader', { round: i + 1 }));
    }

    const allParticipants = new Map<string, any>(); // Map to store unique participants and their group assignments across all rounds

    generatedGroups.forEach((round, roundIndex) => {
      round.forEach((group: Group) => {
        group.participants.forEach((participant: Participant) => {
          if (!allParticipants.has(participant.id)) {
            allParticipants.set(participant.id, {
              isLeader: participant.isGroupLeader ? 'X' : '',
              groups: new Array(maxRound).fill(''), // Initialize with empty strings for all rounds
              data: participant
            });
          }
          allParticipants.get(participant.id).groups[roundIndex] = group.id;
        });
      });
    });

    allParticipants.forEach((value, _key) => {
      const row: any[] = [];
      displayColumns.forEach(col => row.push(value.data[col]));
      row.push(value.isLeader);
      for (let i = 0; i < maxRound; i++) {
        row.push(value.groups[i]);
      }
      ws_data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'All Rounds');

    XLSX.writeFile(wb, t('groupGenerator.texts.excelFileName'));
  };

  const prepareDataForDownload = () => {
    const ws_data: any[][] = [[]];
    displayColumns.forEach(col => ws_data[0].push(col));
    ws_data[0].push(t('groupGenerator.texts.groupLeaderColumn'));

    const maxRound = generatedGroups.length; // Total number of rounds
    for (let i = 0; i < maxRound; i++) {
      ws_data[0].push(t('groupGenerator.texts.roundHeader', { round: i + 1 }));
    }

    const allParticipants = new Map<string, any>(); // Map to store unique participants and their group assignments across all rounds

    generatedGroups.forEach((round, roundIndex) => {
      round.forEach((group: Group) => {
        group.participants.forEach((participant: Participant) => {
          if (!allParticipants.has(participant.id)) {
            allParticipants.set(participant.id, {
              isLeader: participant.isGroupLeader ? 'X' : '',
              groups: new Array(maxRound).fill(''), // Initialize with empty strings for all rounds
              data: participant
            });
          }
          allParticipants.get(participant.id).groups[roundIndex] = group.id;
        });
      });
    });

    allParticipants.forEach((value, _key) => {
      const row: any[] = [];
      displayColumns.forEach(col => row.push(value.data[col]));
      row.push(value.isLeader);
      for (let i = 0; i < maxRound; i++) {
        row.push(value.groups[i]);
      }
      ws_data.push(row);
    });
    return ws_data;
  };

  

  const handleDownloadCsv = () => {
    const ws_data = prepareDataForDownload();
    const csv = Papa.unparse(ws_data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // feature detection
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', t('groupGenerator.texts.csvFileName'));
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (processedData.length === 0) {
    return null;
  }

  return (
    <Box sx={{ marginTop: '20px' }}>
      <Typography variant="h6">{t('groupGenerator.texts.header')}</Typography>
      <TextField label={t('groupGenerator.fields.groupSize')} type="number" fullWidth sx={{ marginTop: '10px' }} value={groupSettings.groupSize} onChange={(e) => handleChange('groupSize', parseInt(e.target.value))} />
      <TextField label={t('groupGenerator.fields.minLeaders')} type="number" fullWidth sx={{ marginTop: '10px' }} value={groupSettings.minLeaders} onChange={(e) => handleChange('minLeaders', parseInt(e.target.value))} />
      <TextField label={t('groupGenerator.fields.rounds')} type="number" fullWidth sx={{ marginTop: '10px' }} value={groupSettings.rounds} onChange={(e) => handleChange('rounds', parseInt(e.target.value))} />
      <FormControl fullWidth sx={{ marginTop: '10px' }}>
        <InputLabel id="shuffle-policy-label">{t('groupGenerator.fields.shufflePolicy')}</InputLabel>
        <Select labelId="shuffle-policy-label" value={groupSettings.shufflePolicy} onChange={(e) => handleChange('shufflePolicy', e.target.value)} label={t('groupGenerator.fields.shufflePolicy')}>
          <MenuItem value="unique">{t('groupGenerator.shufflePolicyOptions.unique')}</MenuItem>
          <MenuItem value="random">{t('groupGenerator.shufflePolicyOptions.random')}</MenuItem>
        </Select>
      </FormControl>
      <FormControlLabel control={<Checkbox checked={groupSettings.balanceGenders} onChange={(e) => handleChange('balanceGenders', e.target.checked)} />} label={t('groupGenerator.fields.balanceGenders')} />
      <FormControlLabel control={<Checkbox checked={groupSettings.splitByTargetAge} onChange={(e) => handleChange('splitByTargetAge', e.target.checked)} />} label={t('groupGenerator.fields.splitByTargetAge')} />
      <FormControlLabel control={<Checkbox checked={groupSettings.compulsoryGroupLeader} onChange={(e) => handleChange('compulsoryGroupLeader', e.target.checked)} />} label={t('groupGenerator.fields.compulsoryGroupLeader')} />
      <FormControl fullWidth sx={{ marginTop: '10px' }}>
        <InputLabel id="columns-to-display-label">{t('groupGenerator.fields.columnsToDisplay')}</InputLabel>
        <Select
          multiple
          labelId="columns-to-display-label"
          value={displayColumns}
          onChange={(e) => setDisplayColumns(e.target.value as string[])}
          label={t('groupGenerator.fields.columnsToDisplay')}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as string[]).map((value) => (
                <Chip key={value} label={value} />
              ))}
            </Box>
          )}
        >
          {headers.map((header) => (
            <MenuItem key={header} value={header}>
              <Checkbox checked={displayColumns.indexOf(header) > -1} />
              <ListItemText primary={header} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box sx={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <Button variant="contained" onClick={handleGenerateGroups}>{t('groupGenerator.texts.generateGroups')}</Button>
        <Button variant="contained" onClick={handleDownload} disabled={generatedGroups.length === 0}>{t('groupGenerator.texts.downloadXls')}</Button>
        <Button variant="contained" onClick={handleDownloadCsv} disabled={generatedGroups.length === 0}>{t('groupGenerator.texts.downloadCsv')}</Button>
      </Box>
    </Box>
  );
};

export default GroupGenerator;

