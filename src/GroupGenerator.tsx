
import React from 'react';
import { useStore } from './store';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Button, Chip, ListItemText } from '@mui/material';
import * as XLSX from 'xlsx';

const GroupGenerator: React.FC = () => {
  const { groupSettings, setGroupSettings, processedData, setGeneratedGroups, groupLeaderValues, maleValues, femaleValues, targetAgeRanges, participantPairs, setParticipantPairs, generatedGroups, displayColumns, setDisplayColumns, headers } = useStore();

  const handleChange = (field: string, value: any) => {
    setGroupSettings({ [field]: value });
  };

  const getAverageAge = (group) => {
    if (group.participants.length === 0) return 0;
    const totalAge = group.participants.reduce((sum, p) => sum + parseInt(p.age), 0);
    return totalAge / group.participants.length;
  };

  const handleGenerateGroups = () => {
    const { groupSize, rounds, minLeaders, balanceGenders, splitByTargetAge, shufflePolicy } = groupSettings;
    const leaders = processedData.filter(p => groupLeaderValues.includes(p.isGroupLeader));
    const nonLeaders = processedData.filter(p => !groupLeaderValues.includes(p.isGroupLeader));

    const newGeneratedGroups = [];
    let currentParticipantPairs = new Set(participantPairs);

    for (let i = 0; i < rounds; i++) {
      const roundGroups: any[] = [];
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
        currentGroup: any,
        remainingNonLeaders: any[],
        balanceGenders: boolean,
        splitByTargetAge: boolean,
        shufflePolicy: string,
        maleValues: string[],
        femaleValues: string[],
        currentParticipantPairs: Set<string>,
        groupSize: number,
        targetAgeRanges: { from: string; to: string; name: string }[]
      ) => {
        if (remainingNonLeaders.length === 0) return null;

        let candidates = [...remainingNonLeaders];

        if (splitByTargetAge) {
          const currentGroupAverageAge = getAverageAge(currentGroup);
          const suitableCandidates = candidates.filter(p => {
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
          const currentMaleCount = currentGroup.participants.filter(p => maleValues.includes(p.gender)).length;
          const currentFemaleCount = currentGroup.participants.filter(p => femaleValues.includes(p.gender)).length;

          const idealMaleCount = Math.ceil(groupSize / 2);
          const idealFemaleCount = Math.floor(groupSize / 2);

          let preferredGender = null;
          if (currentMaleCount < idealMaleCount && currentFemaleCount < idealFemaleCount) {
            const malesInRemaining = candidates.filter(p => maleValues.includes(p.gender)).length;
            const femalesInRemaining = candidates.filter(p => femaleValues.includes(p.gender)).length;
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
            const genderCandidates = candidates.filter(p =>
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
          return candidates.sort((a, b) => {
            let aConflicts = 0;
            let bConflicts = 0;
            for (const existingParticipant of currentGroup.participants) {
              const pairKeyA = `${Math.min(a.id, existingParticipant.id)}-${Math.max(a.id, existingParticipant.id)}`;
              const pairKeyB = `${Math.min(b.id, existingParticipant.id)}-${Math.max(b.id, existingParticipant.id)}`;
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
            currentParticipantPairs.add(`${Math.min(p1, p2)}-${Math.max(p1, p2)}`);
          }
        }
      });

      newGeneratedGroups.push(roundGroups);
    }
    setGeneratedGroups(newGeneratedGroups);
    setParticipantPairs(currentParticipantPairs);
  };

  const handleDownload = () => {
    const wb = XLSX.utils.book_new();

    generatedGroups.forEach((round, roundIndex) => {
      const ws_data: any[][] = [[]];
      displayColumns.forEach(col => ws_data[0].push(col.charAt(0).toUpperCase() + col.slice(1)));
      ws_data[0].push('Group Leader');

      const roundParticipants = new Map();

      round.forEach((group: any) => {
        group.participants.forEach((participant: any) => {
          if (!roundParticipants.has(participant.id)) {
            roundParticipants.set(participant.id, {
              isLeader: groupLeaderValues.includes(participant.isGroupLeader) ? 'X' : '',
              groups: {},
              data: participant
            });
          }
          roundParticipants.get(participant.id).groups[roundIndex] = group.id;
        });
      });

      const maxRound = generatedGroups.length - 1;
      for (let i = 0; i <= maxRound; i++) {
        ws_data[0].push(`Round ${i + 1}`);
      }

      roundParticipants.forEach((value, key) => {
        const row: any[] = [];
        displayColumns.forEach(col => row.push(value.data[col]));
        row.push(value.isLeader);
        for (let i = 0; i <= maxRound; i++) {
          row.push(value.groups[i] || '');
        }
        ws_data.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      XLSX.utils.book_append_sheet(wb, ws, `Round ${roundIndex + 1}`);
    });

    XLSX.writeFile(wb, 'group_results.xlsx');
  };

  if (processedData.length === 0) {
    return null;
  }

  return (
    <Box sx={{ marginTop: '20px' }}>
      <Typography variant="h6">Group Generation Settings</Typography>
      <TextField label="Size of groups" type="number" fullWidth sx={{ marginTop: '10px' }} value={groupSettings.groupSize} onChange={(e) => handleChange('groupSize', parseInt(e.target.value))} />
      <TextField label="Minimum number of group leaders in a group" type="number" fullWidth sx={{ marginTop: '10px' }} value={groupSettings.minLeaders} onChange={(e) => handleChange('minLeaders', parseInt(e.target.value))} />
      <TextField label="Number of rounds" type="number" fullWidth sx={{ marginTop: '10px' }} value={groupSettings.rounds} onChange={(e) => handleChange('rounds', parseInt(e.target.value))} />
      <FormControl fullWidth sx={{ marginTop: '10px' }}>
        <InputLabel id="shuffle-policy-label">Shuffle Policy</InputLabel>
        <Select labelId="shuffle-policy-label" value={groupSettings.shufflePolicy} onChange={(e) => handleChange('shufflePolicy', e.target.value)} label="Shuffle Policy">
          <MenuItem value="unique">Unique</MenuItem>
          <MenuItem value="random">Random</MenuItem>
        </Select>
      </FormControl>
      <FormControlLabel control={<Checkbox checked={groupSettings.balanceGenders} onChange={(e) => handleChange('balanceGenders', e.target.checked)} />} label="Balance genders" />
      <FormControlLabel control={<Checkbox checked={groupSettings.splitByTargetAge} onChange={(e) => handleChange('splitByTargetAge', e.target.checked)} />} label="Split by target age" />
      <FormControl fullWidth sx={{ marginTop: '10px' }}>
        <InputLabel id="columns-to-display-label">Columns to Display</InputLabel>
        <Select
          multiple
          labelId="columns-to-display-label"
          value={displayColumns}
          onChange={(e) => setDisplayColumns(e.target.value as string[])}
          label="Columns to Display"
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
        <Button variant="contained" onClick={handleGenerateGroups}>Generate Groups</Button>
        <Button variant="contained" onClick={handleDownload} disabled={generatedGroups.length === 0}>Download XLS</Button>
      </Box>
    </Box>
  );
};

export default GroupGenerator;
