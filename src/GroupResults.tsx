import React from 'react';
import { useStore } from './store';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';

const GroupResults: React.FC = () => {
  const { generatedGroups, groupLeaderValues, groupSettings, displayColumns } = useStore();
  const { t } = useTranslation();

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
      <Typography variant="h6">{t('groupResults.texts.header')}</Typography>
      {generatedGroups.map((round, roundIndex) => (
        <Box key={roundIndex} sx={{ marginTop: '20px' }}>
          <Typography variant="h6">{t('groupResults.texts.round')} {roundIndex + 1}</Typography>
          {round.map((group: any) => (
            <Box key={group.id} sx={{ marginTop: '10px' }}>
              <Typography>{t('groupResults.fields.group')} {group.id} ({t('groupResults.fields.averageAge')}: {getAverageAge(group)})</Typography>
              <TableContainer component={Paper} sx={{ width: '100%' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      {displayColumns.map(column => (
                        <TableCell key={column}>{column.charAt(0).toUpperCase() + column.slice(1)}</TableCell>
                      ))}
                      <TableCell>{t('groupResults.fields.targetAge')}</TableCell>
                      <TableCell>{t('groupResults.fields.groupmateRedundancy')}</TableCell>
                      {groupSettings.splitByTargetAge && <TableCell>{t('groupResults.fields.unmetTargetAge')}</TableCell>}
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
                        {displayColumns.map(column => (
                          <TableCell key={column}>{participant[column]}</TableCell>
                        ))}
                        <TableCell>{participant.targetAge}</TableCell>
                        <TableCell>{participant.groupmateRedundancy}</TableCell>
                        {groupSettings.splitByTargetAge && <TableCell>{participant.unmetTargetAge}</TableCell>}
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