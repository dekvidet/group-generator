
import React from 'react';
import { useStore } from './store';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Button } from '@mui/material';
import * as XLSX from 'xlsx';

const GroupGenerator: React.FC = () => {
  const { groupSettings, setGroupSettings, processedData, setGeneratedGroups, groupLeaderValues, maleValues, femaleValues, targetAgeRanges, participantPairs, setParticipantPairs, generatedGroups } = useStore();

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

      if (shufflePolicy === 'unique') {
        // Sort non-leaders to prioritize those with fewer past pairings
        availableNonLeaders.sort((a, b) => {
          let aPastPairs = 0;
          let bPastPairs = 0;
          for (const pair of currentParticipantPairs) {
            if (pair.includes(a.id)) aPastPairs++;
            if (pair.includes(b.id)) bPastPairs++;
          }
          return aPastPairs - bPastPairs;
        });

        // Assign non-leaders to groups, trying to avoid past pairings
        for (const participant of availableNonLeaders) {
          let bestGroup = null;
          let minConflicts = Infinity;

          for (const group of roundGroups) {
            if (group.participants.length < groupSize) {
              let conflicts = 0;
              for (const existingParticipant of group.participants) {
                const pairKey = `${Math.min(participant.id, existingParticipant.id)}-${Math.max(participant.id, existingParticipant.id)}`;
                if (currentParticipantPairs.has(pairKey)) {
                  conflicts++;
                }
              }
              if (conflicts < minConflicts) {
                minConflicts = conflicts;
                bestGroup = group;
              }
            }
          }
          if (bestGroup) {
            bestGroup.participants.push(participant);
          } else {
            // If no suitable group found (e.g., all groups full or too many conflicts), add to a random available group
            const availableGroups = roundGroups.filter(g => g.participants.length < groupSize);
            if (availableGroups.length > 0) {
              availableGroups[Math.floor(Math.random() * availableGroups.length)].participants.push(availableNonLeaders.shift());
            }
          }
        }

      } else { // Random shuffle
        availableNonLeaders.sort(() => 0.5 - Math.random());
        let nonLeaderIndex = 0;
        for (let j = 0; j < numGroups; j++) {
          while (roundGroups[j].participants.length < groupSize && availableNonLeaders[nonLeaderIndex]) {
            roundGroups[j].participants.push(availableNonLeaders[nonLeaderIndex]);
            nonLeaderIndex++;
          }
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
      const ws_data: any[][] = [['ID', 'Full Name']];
      const roundParticipants = new Map();

      round.forEach((group: any) => {
        group.participants.forEach((participant: any) => {
          if (!roundParticipants.has(participant.id)) {
            roundParticipants.set(participant.id, {
              fullName: `${participant.firstName} ${participant.lastName}`,
              isLeader: groupLeaderValues.includes(participant.isGroupLeader) ? 'X' : '',
              groups: {}
            });
          }
          roundParticipants.get(participant.id).groups[roundIndex] = group.id;
        });
      });

      const maxRound = generatedGroups.length - 1;
      for (let i = 0; i <= maxRound; i++) {
        ws_data[0].push(`Round ${i + 1}`);
      }
      ws_data[0].push('Group Leader');

      roundParticipants.forEach((value, key) => {
        const row = [key, value.fullName];
        for (let i = 0; i <= maxRound; i++) {
          row.push(value.groups[i] || '');
        }
        row.push(value.isLeader);
        ws_data.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      XLSX.utils.book_append_sheet(wb, ws, `Round ${roundIndex + 1}`);
    });

    XLSX.writeFile(wb, 'group_results.xlsx');
  };

  return (
    <Box sx={{ marginTop: '20px' }}>
      <Typography variant="h6">Group Generation Settings</Typography>
      <TextField label="Size of groups" type="number" fullWidth sx={{ marginTop: '10px' }} value={groupSettings.groupSize} onChange={(e) => handleChange('groupSize', parseInt(e.target.value))} />
      <TextField label="Minimum number of group leaders in a group" type="number" fullWidth sx={{ marginTop: '10px' }} value={groupSettings.minLeaders} onChange={(e) => handleChange('minLeaders', parseInt(e.target.value))} />
      <TextField label="Number of rounds" type="number" fullWidth sx={{ marginTop: '10px' }} value={groupSettings.rounds} onChange={(e) => handleChange('rounds', parseInt(e.target.value))} />
      <FormControl fullWidth sx={{ marginTop: '10px' }}>
        <InputLabel>Shuffle Policy</InputLabel>
        <Select value={groupSettings.shufflePolicy} onChange={(e) => handleChange('shufflePolicy', e.target.value)}>
          <MenuItem value="unique">Unique</MenuItem>
          <MenuItem value="random">Random</MenuItem>
        </Select>
      </FormControl>
      <FormControlLabel control={<Checkbox checked={groupSettings.balanceGenders} onChange={(e) => handleChange('balanceGenders', e.target.checked)} />} label="Balance genders" />
      <FormControlLabel control={<Checkbox checked={groupSettings.splitByTargetAge} onChange={(e) => handleChange('splitByTargetAge', e.target.checked)} />} label="Split by target age" />
      <Box sx={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <Button variant="contained" onClick={handleGenerateGroups}>Generate Groups</Button>
        <Button variant="contained" onClick={handleDownload} disabled={generatedGroups.length === 0}>Download XLS</Button>
      </Box>
    </Box>
  );
};

export default GroupGenerator;
