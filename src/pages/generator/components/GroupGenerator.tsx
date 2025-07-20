
import React from 'react';
import { useStore } from '../../../store';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Button, Chip, ListItemText } from '@mui/material';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import type { Group, Participant, ParticipantWithStatistics } from '../../../types';
import { calculateGenderRatioScore, calculateGroupmateRedundancyScore, calculateRepeatedGroupmateCount, calculateTargetAgeScore, calculateUnmetTargetAgeGroupmateCount, getBestParticipant } from './GroupGeneration';

const GroupGenerator: React.FC = () => {
  const { groupSettings, setGroupSettings, processedData, setGeneratedGroups, maleValues, femaleValues, targetAgeRanges, generatedGroups, displayColumns, setDisplayColumns, headers } = useStore();
  const { t } = useTranslation();

  const handleChange = (field: string, value: any) => {
    setGroupSettings({ [field]: value });
  };

  function addStatistics(participant: Participant): ParticipantWithStatistics {
    return ({
      ...participant,
      statistics: {
        repeatedGroupmateCount: 0,
        unmetTargetAgeGroupmateCount: 0,
        accumulatedRepeatedGroupmateCount: 0,
        accumulatedUnmetTargetAgeGroupmateCounts: 0,
      }
    })
  }

  const handleGenerateGroups = () => {
    const { groupSize, rounds, minLeaders, balanceGenders, splitByTargetAge, shufflePolicy, compulsoryGroupLeader } = groupSettings;
    const pastGroupmates: Record<string, Set<string>> = {};
    const allParticipants: Participant[] = processedData
    const leaders = allParticipants.filter((p: Participant) => p.isGroupLeader);
    const nonLeaders = allParticipants.filter((p: Participant) => !p.isGroupLeader);

    // Compulsory group leader logic (global before rounds)
    if (compulsoryGroupLeader) {
      const numGroups = Math.ceil(allParticipants.length / groupSize);
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

    const nextGeneratedGroups: Group[][] = [];

    for (let i = 0; i < rounds; i++) {
      const roundGroups: Group[] = [];
      const numGroups = Math.ceil(allParticipants.length / groupSize);

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
              roundGroups[k].participants.push(addStatistics(leaders[leaderIndex]));
              leaderIndex++;
            }
          }
        }
        while (leaderIndex < leaders.length) {
          for (let k = 0; k < numGroups; k++) {
            if (leaders[leaderIndex]) {
              roundGroups[k].participants.push(addStatistics(leaders[leaderIndex]));
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
              roundGroups[k].participants.push(addStatistics(leaders[leaderIndex]));
              leaderIndex++;
            }
          }
        }
        while (leaderIndex < leaders.length) {
          for (let k = 0; k < numGroups; k++) {
            if (leaders[leaderIndex]) {
              roundGroups[k].participants.push(addStatistics(leaders[leaderIndex]));
              leaderIndex++;
            }
          }
        }
      }

      let availableNonLeaders = [...nonLeaders];

      while (availableNonLeaders.length > 0) {
        let assignedThisIteration = false;
        for (const group of roundGroups) {
          if (group.participants.length < groupSize) {
            const totalMaleCount = allParticipants.filter(p => maleValues.includes(p.gender)).length;
            const totalFemaleCount = allParticipants.filter(p => femaleValues.includes(p.gender)).length;
            const maleRatio = totalMaleCount / (totalMaleCount + totalFemaleCount);
            const participantToAssign = getBestParticipant(
              group,
              availableNonLeaders,
              balanceGenders,
              splitByTargetAge,
              shufflePolicy,
              maleValues,
              femaleValues,
              pastGroupmates,
              groupSize,
              targetAgeRanges,
              maleRatio
            );

            if (participantToAssign) {
              group.participants.push(addStatistics(participantToAssign));
              availableNonLeaders = availableNonLeaders.filter(p => p.id !== participantToAssign.id);
              assignedThisIteration = true;
            }
          }
        }
        if (!assignedThisIteration && availableNonLeaders.length > 0) {
          break;
        }
      }

      // Calculate statistics for each participant for the current round's groups
      const roundGroupsWithStatistics = roundGroups.map(group => ({
        ...group,
        participants: group.participants.map(participant => ({
          ...participant,
          statistics: {
            ...participant.statistics,
            repeatedGroupmateCount: calculateRepeatedGroupmateCount(group, participant, pastGroupmates),
            unmetTargetAgeGroupmateCount: calculateUnmetTargetAgeGroupmateCount(group, participant, targetAgeRanges),
          }
        }))
      }))

      // Update list of groupmates who already met eachother
      roundGroupsWithStatistics.forEach(group => {
        group.participants.forEach(participant => {
          if (!pastGroupmates[participant.id]) {
            pastGroupmates[participant.id] = new Set();
          }
          group.participants.forEach(groupmate => {
            if (participant.id !== groupmate.id) {
              pastGroupmates[participant.id].add(groupmate.id);
            }
          });
        });
      });

      // Calculate statistics for each group for the current round
      const totalMaleCount = allParticipants.filter(p => maleValues.includes(p.gender)).length;
      const totalFemaleCount = allParticipants.filter(p => femaleValues.includes(p.gender)).length;

      roundGroupsWithStatistics.forEach(group => {
        const genderRatioScore = calculateGenderRatioScore(group, maleValues, femaleValues, totalMaleCount, totalFemaleCount);
        const targetAgeScore = calculateTargetAgeScore(group, targetAgeRanges);
        const groupmateRedundancyScore = calculateGroupmateRedundancyScore(group);

        const totalScore = (genderRatioScore + targetAgeScore + groupmateRedundancyScore) / 3;

        group.statistics = {
          genderRatioScore,
          targetAgeScore,
          groupmateRedundancyScore,
          totalScore,
        };
      });

      nextGeneratedGroups.push(roundGroupsWithStatistics);
    }

    // Calculate accumulated statistics for participants
    const accumulatedUnmetTargetAgeGroupmateCounts:  Record<string, number> = {};
    const accumulatedRepeatedGroupmateCount:  Record<string, number> = {};
    const nextGeneratedGroupsWithStatistics = nextGeneratedGroups.map((round) => {
      return round.map(group => {
        const participantsWithStatistics = group.participants.map(participant => {

          accumulatedRepeatedGroupmateCount[participant.id] = (accumulatedRepeatedGroupmateCount[participant.id] || 0) + participant.statistics.repeatedGroupmateCount;
          if (groupSettings.splitByTargetAge) {
            accumulatedUnmetTargetAgeGroupmateCounts[participant.id] = (accumulatedUnmetTargetAgeGroupmateCounts[participant.id] || 0) + participant?.statistics?.unmetTargetAgeGroupmateCount;
          }

          return { ...participant, statistics: {
            ...participant.statistics,
            accumulatedRepeatedGroupmateCount: accumulatedRepeatedGroupmateCount[participant.id],
            accumulatedUnmetTargetAgeGroupmateCounts: accumulatedUnmetTargetAgeGroupmateCounts[participant.id],
          }};
        });

        return { ...group, participants: participantsWithStatistics };
      });
    });

    setGeneratedGroups(nextGeneratedGroupsWithStatistics);
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

