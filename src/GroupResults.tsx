import React from 'react';
import { useStore } from './store';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const GroupResults: React.FC = () => {
  const { generatedGroups, groupLeaderValues, groupSettings } = useStore();

  const getAverageAge = (group: any) => {
    if (group.participants.length === 0) return 0;
    const totalAge = group.participants.reduce((sum: number, p: any) => sum + parseInt(p.age), 0);
    return (totalAge / group.participants.length).toFixed(1);
  };

  if (generatedGroups.length === 0) {
    return null;
  }

  return (
    <Box sx={{ marginTop: '20px' }}>
      <Typography variant="h6">Generated Groups</Typography>
      {generatedGroups.map((round, roundIndex) => (
        <Box key={roundIndex} sx={{ marginTop: '20px' }}>
          <Typography variant="h6">Round {roundIndex + 1}</Typography>
          {round.map((group: any) => (
            <Box key={group.id} sx={{ marginTop: '10px' }}>
              <Typography>Group {group.id} (average age: {getAverageAge(group)})</Typography>
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
                      <TableCell>Target Age</TableCell>
                      <TableCell>Groupmate Redundancy</TableCell>
                      {groupSettings.splitByTargetAge && <TableCell>Age Redundancy</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.participants.map((participant: any) => (
                      <TableRow
                        key={participant.id}
                        sx={{
                          fontWeight: groupLeaderValues.includes(participant.isGroupLeader) ? 'bold' : 'normal',
                          backgroundColor: groupLeaderValues.includes(participant.isGroupLeader) ? '#666' : 'inherit',
                        }}
                      >
                        <TableCell>{participant.id}</TableCell>
                        <TableCell>{participant.firstName}</TableCell>
                        <TableCell>{participant.lastName}</TableCell>
                        <TableCell>{participant.gender}</TableCell>
                        <TableCell>{participant.age}</TableCell>
                        <TableCell>{participant.email}</TableCell>
                        <TableCell>{participant.targetAge}</TableCell>
                        <TableCell>{participant.groupmateRedundancy}</TableCell>
                        {groupSettings.splitByTargetAge && <TableCell>{participant.ageRedundancy}</TableCell>}
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