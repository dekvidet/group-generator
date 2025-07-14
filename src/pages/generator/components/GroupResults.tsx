import React from 'react';
import { useStore } from '../../../store';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface Participant {
  id: string;
  gender: string;
  age: string;
  isGroupLeader: boolean;
  targetAge?: string;
  groupmateRedundancy?: number;
  unmetTargetAge?: number;
}

interface Group {
  id: number;
  participants: Participant[];
}

const GroupResults: React.FC = () => {
  const { generatedGroups, groupSettings, displayColumns, mappedColumns } = useStore();
  const { t } = useTranslation();

  const getAverageAge = (group: Group) => {
    if (group.participants.length === 0) return 0;
    const totalAge = group.participants.reduce((sum: number, p: Participant) => sum + parseInt(p.age), 0);
    return (totalAge / group.participants.length).toFixed(1);
  };

  if (generatedGroups.length === 0) {
    return null;
  }

  const showAverageAge = mappedColumns.age;
console.log(generatedGroups)
  return (
    <Box sx={{ marginTop: '20px' }}>
      <Typography variant="h6">{t('groupResults.texts.header')}</Typography>
      {generatedGroups.map((round, roundIndex) => (
        <Box key={roundIndex} sx={{ marginTop: '20px' }}>
          <Typography variant="h6">{t('groupResults.texts.round')} {roundIndex + 1}</Typography>
          {round.map((group: Group) => (
            <Box key={group.id} sx={{ marginTop: '10px' }}>
              <Typography>{t('groupResults.fields.group')} {group.id} {showAverageAge && `(${t('groupResults.fields.averageAge')}: ${getAverageAge(group)})`}</Typography>
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
                    {group.participants.map((participant: Participant) => (
                      <TableRow
                        key={participant.id}
                        sx={{
                          fontWeight: participant.isGroupLeader ? 'bold' : 'normal',
                          backgroundColor: participant.isGroupLeader ? '#666' : 'inherit',
                        }}
                      >
                        {displayColumns.map(column => (
                          <TableCell key={column}>{participant[column as keyof Participant]}</TableCell>
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