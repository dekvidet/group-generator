import React from 'react';
import { useStore } from './store';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import * as XLSX from 'xlsx';

const GroupResults: React.FC = () => {
  const { generatedGroups, groupLeaderValues } = useStore();

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

  if (generatedGroups.length === 0) {
    return null;
  }

  return (
    <Box sx={{ marginTop: '20px' }}>
      <Typography variant="h6">Generated Groups</Typography>
      <Button variant="contained" onClick={handleDownload} sx={{ marginBottom: '20px' }}>Download XLS</Button>
      {generatedGroups.map((round, roundIndex) => (
        <Box key={roundIndex} sx={{ marginTop: '20px' }}>
          <Typography variant="h6">Round {roundIndex + 1}</Typography>
          {round.map((group: any) => (
            <Box key={group.id} sx={{ marginTop: '10px' }}>
              <Typography>Group {group.id}</Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>First Name</TableCell>
                      <TableCell>Last Name</TableCell>
                      <TableCell>Gender</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell>Email</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.participants.map((participant: any) => (
                      <TableRow key={participant.id} sx={{ fontWeight: groupLeaderValues.includes(participant.isGroupLeader) ? 'bold' : 'normal' }}>
                        <TableCell>{participant.id}</TableCell>
                        <TableCell>{participant.firstName}</TableCell>
                        <TableCell>{participant.lastName}</TableCell>
                        <TableCell>{participant.gender}</TableCell>
                        <TableCell>{participant.age}</TableCell>
                        <TableCell>{participant.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
};

export default GroupResults;