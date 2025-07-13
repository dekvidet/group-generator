import React from 'react';
import { useStore } from './store';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';

const StatisticsTables: React.FC = () => {
  const { participantRatios, ageGroups, mappedColumns } = useStore();
  const { t } = useTranslation();

  if (!participantRatios) {
    return null;
  }

  const showAgeGroupsTable = mappedColumns.age && mappedColumns.targetAge;
  const showGenderRows = mappedColumns.gender;
  const showTeamLeadersColumn = mappedColumns.isGroupLeader;

  return (
    <Box sx={{ marginTop: '20px', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: '20px' }}>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h6">{t('statisticsTables.texts.participantRatios')}</Typography>
        <TableContainer component={Paper} sx={{ width: '100%' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                <TableCell>{t('statisticsTables.texts.allParticipants')}</TableCell>
                {showTeamLeadersColumn && <TableCell>{t('statisticsTables.texts.teamLeaders')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {showGenderRows && (
                <>
                  <TableRow>
                    <TableCell>{t('statisticsTables.texts.male')}</TableCell>
                    <TableCell>{participantRatios.men.all}</TableCell>
                    {showTeamLeadersColumn && <TableCell>{participantRatios.men.leaders}</TableCell>}
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('statisticsTables.texts.female')}</TableCell>
                    <TableCell>{participantRatios.women.all}</TableCell>
                    {showTeamLeadersColumn && <TableCell>{participantRatios.women.leaders}</TableCell>}
                  </TableRow>
                </>
              )}
              {(!showGenderRows || participantRatios.unknown.all > 0) && (
                <TableRow>
                  <TableCell>{t('statisticsTables.texts.unknown')}</TableCell>
                  <TableCell>{participantRatios.unknown.all}</TableCell>
                  {showTeamLeadersColumn && <TableCell>{participantRatios.unknown.leaders}</TableCell>}
                </TableRow>
              )}
              <TableRow>
                <TableCell>{t('statisticsTables.texts.total')}</TableCell>
                <TableCell>{participantRatios.men.all + participantRatios.women.all + participantRatios.unknown.all}</TableCell>
                {showTeamLeadersColumn && <TableCell>{participantRatios.men.leaders + participantRatios.women.leaders + participantRatios.unknown.leaders}</TableCell>}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      {showAgeGroupsTable && (
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6">{t('statisticsTables.texts.ageGroups')}</Typography>
          <TableContainer component={Paper} sx={{ width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell></TableCell>
                  {Object.keys(ageGroups).map(rangeName => (
                    <TableCell key={rangeName}>{rangeName}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>{t('statisticsTables.texts.male')}</TableCell>
                  {Object.keys(ageGroups).map(rangeName => (
                    <TableCell key={rangeName}>{ageGroups[rangeName].men}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>{t('statisticsTables.texts.female')}</TableCell>
                  {Object.keys(ageGroups).map(rangeName => (
                    <TableCell key={rangeName}>{ageGroups[rangeName].women}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>{t('statisticsTables.texts.total')}</TableCell>
                  {Object.keys(ageGroups).map(rangeName => (
                    <TableCell key={rangeName}>{ageGroups[rangeName].men + ageGroups[rangeName].women}</TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default StatisticsTables;