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
    const participants = processedData.filter(p => !groupLeaderValues.includes(p.isGroupLeader));

    const newGeneratedGroups = []; // Use a new array to store the latest results
    let currentParticipantPairs = new Set(participantPairs);

    for (let i = 0; i < rounds; i++) {
      const roundGroups: any[] = [];
      let availableParticipants = [...participants];
      const numGroups = Math.ceil(processedData.length / groupSize);

      // Initialize groups with leaders
      for (let j = 0; j < numGroups; j++) {
        roundGroups.push({ id: j + 1, participants: [] });
      }
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

      // Distribute participants
      if (splitByTargetAge) {
        // This logic needs to be more sophisticated to ensure groups are filled and age ranges are respected
        // For now, a simplified approach:
        targetAgeRanges.forEach(range => {
          const rangeParticipants = availableParticipants.filter(p => parseInt(p.age) >= parseInt(range.from) && parseInt(p.age) <= parseInt(range.to));
          availableParticipants = availableParticipants.filter(p => !(parseInt(p.age) >= parseInt(range.from) && parseInt(p.age) <= parseInt(range.to)));

          let currentRangeParticipants = [...rangeParticipants];
          for (let j = 0; j < numGroups; j++) {
            while (roundGroups[j].participants.length < groupSize && currentRangeParticipants.length > 0) {
              const participant = currentRangeParticipants.shift();
              roundGroups[j].participants.push(participant);
            }
          }
        });
      }

      if (balanceGenders && !splitByTargetAge) { // Gender balance takes precedence if no age split
        const men = availableParticipants.filter(p => maleValues.includes(p.gender));
        const women = availableParticipants.filter(p => femaleValues.includes(p.gender));
        availableParticipants = [];

        const totalMen = men.length;
        const totalWomen = women.length;
        const totalParticipants = totalMen + totalWomen;
        const menRatio = totalMen / totalParticipants;
        const womenRatio = totalWomen / totalParticipants;

        for (let j = 0; j < numGroups; j++) {
          const currentGroupSize = roundGroups[j].participants.length;
          const remainingCapacity = groupSize - currentGroupSize;
          const targetMen = Math.round(menRatio * remainingCapacity);
          const targetWomen = Math.round(womenRatio * remainingCapacity);

          for (let k = 0; k < targetMen; k++) {
            if (men.length > 0) {
              roundGroups[j].participants.push(men.shift());
            }
          }
          for (let k = 0; k < targetWomen; k++) {
            if (women.length > 0) {
              roundGroups[j].participants.push(women.shift());
            }
          }
        }
        availableParticipants = [...men, ...women]; // Remaining participants
      }

      // Fill remaining spots with available participants (random or unique shuffle)
      if (shufflePolicy === 'unique') {
        // This is a simplified unique shuffle. A proper implementation would involve a more complex algorithm
        // to maximize unique pairings. For now, it prioritizes participants not yet paired.
        let shuffledAvailableParticipants = [...availableParticipants].sort((a, b) => {
          let aPairs = 0;
          let bPairs = 0;
          roundGroups.forEach(group => {
            group.participants.forEach(p => {
              if (p.id !== a.id && currentParticipantPairs.has(`${a.id}-${p.id}`)) aPairs++;
              if (p.id !== b.id && currentParticipantPairs.has(`${b.id}-${p.id}`)) bPairs++;
            });
          });
          return aPairs - bPairs; // Prioritize those with fewer existing pairs
        });

        for (let j = 0; j < numGroups; j++) {
          while (roundGroups[j].participants.length < groupSize && shuffledAvailableParticipants.length > 0) {
            roundGroups[j].participants.push(shuffledAvailableParticipants.shift());
          }
        }
      } else { // Random shuffle
        let shuffledAvailableParticipants = [...availableParticipants].sort(() => 0.5 - Math.random());
        for (let j = 0; j < numGroups; j++) {
          while (roundGroups[j].participants.length < groupSize && shuffledAvailableParticipants.length > 0) {
            roundGroups[j].participants.push(shuffledAvailableParticipants.shift());
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