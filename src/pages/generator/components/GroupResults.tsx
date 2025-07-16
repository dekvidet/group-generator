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
      <TableContainer component={Paper} sx={{ width: '100%', marginBottom: '20px' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('groupResults.fields.round')}</TableCell>
              <TableCell>{t('groupResults.fields.group')}</TableCell>
              <TableCell>{t('groupResults.fields.genderRatioScore')}</TableCell>
              <TableCell>{t('groupResults.fields.targetAgeScore')}</TableCell>
              <TableCell>{t('groupResults.fields.groupmateRedundancyScore')}</TableCell>
              <TableCell>{t('groupResults.fields.totalScore')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {
              (() => {
                const allRoundGenderRatioScores = generatedGroups.map(round => round.reduce((sum, group) => sum + (group.statistics?.genderRatioScore || 0), 0) / round.length);
                const allRoundTargetAgeScores = generatedGroups.map(round => round.reduce((sum, group) => sum + (group.statistics?.targetAgeScore || 0), 0) / round.length);
                const allRoundGroupmateRedundancyScores = generatedGroups.map(round => round.reduce((sum, group) => sum + (group.statistics?.groupmateRedundancyScore || 0), 0) / round.length);
                const allRoundTotalScores = generatedGroups.map(round => round.reduce((sum, group) => sum + (group.statistics?.totalScore || 0), 0) / round.length);

                const overallGenderRatioScore = allRoundGenderRatioScores.reduce((sum, score) => sum + score, 0) / allRoundGenderRatioScores.length;
                const overallTargetAgeScore = allRoundTargetAgeScores.reduce((sum, score) => sum + score, 0) / allRoundTargetAgeScores.length;
                const overallGroupmateRedundancyScore = allRoundGroupmateRedundancyScores.reduce((sum, score) => sum + score, 0) / allRoundGroupmateRedundancyScores.length;
                const overallTotalScore = allRoundTotalScores.reduce((sum, score) => sum + score, 0) / allRoundTotalScores.length;

                const overallWorstGenderRatioScore = Math.min(...generatedGroups.flatMap(round => round.map(group => group.statistics?.genderRatioScore || 0)));
                const overallWorstTargetAgeScore = Math.min(...generatedGroups.flatMap(round => round.map(group => group.statistics?.targetAgeScore || 0)));
                const overallWorstGroupmateRedundancyScore = Math.min(...generatedGroups.flatMap(round => round.map(group => group.statistics?.groupmateRedundancyScore || 0)));
                const overallWorstTotalScore = Math.min(...generatedGroups.flatMap(round => round.map(group => group.statistics?.totalScore || 0)));

                return (
                  <>
                    <TableRow sx={{ fontWeight: 'bold' }}>
                      <TableCell>{t('groupResults.fields.average')}</TableCell>
                      <TableCell></TableCell>
                      <TableCell>{overallGenderRatioScore.toFixed(2)}</TableCell>
                      <TableCell>{overallTargetAgeScore.toFixed(2)}</TableCell>
                      <TableCell>{overallGroupmateRedundancyScore.toFixed(2)}</TableCell>
                      <TableCell>{overallTotalScore.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow sx={{ fontWeight: 'bold' }}>
                      <TableCell>{t('groupResults.fields.worst')}</TableCell>
                      <TableCell></TableCell>
                      <TableCell>{overallWorstGenderRatioScore.toFixed(2)}</TableCell>
                      <TableCell>{overallWorstTargetAgeScore.toFixed(2)}</TableCell>
                      <TableCell>{overallWorstGroupmateRedundancyScore.toFixed(2)}</TableCell>
                      <TableCell>{overallWorstTotalScore.toFixed(2)}</TableCell>
                    </TableRow>
                  </>
                );
              })()
            }
            {generatedGroups.map((round, roundIndex) => {
              const roundGenderRatioScore = round.reduce((sum, group) => sum + (group.statistics?.genderRatioScore || 0), 0) / round.length;
              const roundTargetAgeScore = round.reduce((sum, group) => sum + (group.statistics?.targetAgeScore || 0), 0) / round.length;
              const roundGroupmateRedundancyScore = round.reduce((sum, group) => sum + (group.statistics?.groupmateRedundancyScore || 0), 0) / round.length;
              const roundTotalScore = round.reduce((sum, group) => sum + (group.statistics?.totalScore || 0), 0) / round.length;

              const roundWorstGenderRatioScore = Math.min(...round.map(group => group.statistics?.genderRatioScore || 0));
              const roundWorstTargetAgeScore = Math.min(...round.map(group => group.statistics?.targetAgeScore || 0));
              const roundWorstGroupmateRedundancyScore = Math.min(...round.map(group => group.statistics?.groupmateRedundancyScore || 0));
              const roundWorstTotalScore = Math.min(...round.map(group => group.statistics?.totalScore || 0));

              return (
                <>
                  {round.map((group: Group, groupIndex: number) => (
                    <TableRow key={`${roundIndex}-${group.id}`}>
                      {groupIndex === 0 && (
                        <TableCell rowSpan={round.length + 2} sx={{ verticalAlign: 'top' }}>
                          {t('groupResults.texts.round')} {roundIndex + 1}
                        </TableCell>
                      )}
                      <TableCell>{group.id}</TableCell>
                      <TableCell>{(group.statistics?.genderRatioScore || 0).toFixed(2)}</TableCell>
                      <TableCell>{(group.statistics?.targetAgeScore || 0).toFixed(2)}</TableCell>
                      <TableCell>{(group.statistics?.groupmateRedundancyScore || 0).toFixed(2)}</TableCell>
                      <TableCell>{(group.statistics?.totalScore || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ fontWeight: 'bold' }}>
                    <TableCell>{t('groupResults.fields.average')}</TableCell>
                    <TableCell>{roundGenderRatioScore.toFixed(2)}</TableCell>
                    <TableCell>{roundTargetAgeScore.toFixed(2)}</TableCell>
                    <TableCell>{roundGroupmateRedundancyScore.toFixed(2)}</TableCell>
                    <TableCell>{roundTotalScore.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow sx={{ fontWeight: 'bold' }}>
                    <TableCell>{t('groupResults.fields.worst')}</TableCell>
                    <TableCell>{roundWorstGenderRatioScore.toFixed(2)}</TableCell>
                    <TableCell>{roundWorstTargetAgeScore.toFixed(2)}</TableCell>
                    <TableCell>{roundWorstGroupmateRedundancyScore.toFixed(2)}</TableCell>
                    <TableCell>{roundWorstTotalScore.toFixed(2)}</TableCell>
                  </TableRow>
                </>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

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