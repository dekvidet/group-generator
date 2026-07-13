import React, { useState } from 'react';
import { useStore } from '../../../store';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Group, Participant } from '../../../types';
import { getAverageAge } from './GroupGeneration';

function calculateScheduleMetrics(rounds: Group[][]) {
  const participantIds = new Set(rounds.flatMap(round => round.flatMap(group => group.participants.map(participant => participant.id))));
  const pairMeetings = new Map<string, number>();
  const exposure = new Map<string, Set<string>>([...participantIds].map(id => [id, new Set<string>()]));
  for (const round of rounds) {
    for (const group of round) {
      for (let first = 0; first < group.participants.length; first++) {
        for (let second = first + 1; second < group.participants.length; second++) {
          const firstId = group.participants[first].id;
          const secondId = group.participants[second].id;
          const key = firstId < secondId ? `${firstId}\u0000${secondId}` : `${secondId}\u0000${firstId}`;
          pairMeetings.set(key, (pairMeetings.get(key) ?? 0) + 1);
          exposure.get(firstId)?.add(secondId);
          exposure.get(secondId)?.add(firstId);
        }
      }
    }
  }
  const possiblePairCount = participantIds.size * (participantIds.size - 1) / 2;
  const exposureCounts = [...exposure.values()].map(groupmates => groupmates.size);
  return {
    uniquePairCoverage: possiblePairCount === 0 ? 0 : pairMeetings.size / possiblePairCount,
    repeatCost: [...pairMeetings.values()].reduce((sum, count) => sum + count * (count - 1) / 2, 0),
    worstPairFrequency: Math.max(0, ...pairMeetings.values()),
    averageExposure: exposureCounts.length === 0 ? 0 : exposureCounts.reduce((sum, count) => sum + count, 0) / exposureCounts.length,
    minimumExposure: exposureCounts.length === 0 ? 0 : Math.min(...exposureCounts),
  };
}

function scoreCellStyle(score: number) {
  if (score >= 0.9) return { color: '#2e7d32', fontWeight: 600 };
  if (score >= 0.75) return { color: '#6b9b70', fontWeight: 600 };
  if (score >= 0.6) return { color: '#a88916', fontWeight: 600 };
  if (score >= 0.4) return { color: '#c27a3a', fontWeight: 600 };
  return { color: '#c45b5b', fontWeight: 600 };
}

function groupElementId(roundIndex: number, groupId: number) {
  return `round-${roundIndex + 1}-group-${groupId}`;
}

const GroupResults: React.FC = () => {
  const { generatedGroups, groupSettings, displayColumns, mappedColumns } = useStore();
  const { t } = useTranslation();
  const [showStatistics, setShowStatistics] = useState(false);

  if (generatedGroups.length === 0) {
    return null;
  }

  const showAverageAge = mappedColumns.age
  const showTargetAgeColumn = mappedColumns.targetAge
  const scheduleMetrics = calculateScheduleMetrics(generatedGroups);
  const scrollToGroup = (roundIndex: number, groupId: number) => {
    document.getElementById(groupElementId(roundIndex, groupId))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box sx={{ marginTop: '20px' }}>
      <Typography variant="h6">{t('groupResults.texts.header')}</Typography>
      <Box sx={{ marginBottom: '10px' }}>
        <Button onClick={() => setShowStatistics(!showStatistics)} variant="outlined">
          {showStatistics ? t('groupResults.buttons.hideStatistics') : t('groupResults.buttons.showStatistics')}
        </Button>
      </Box>
      {showStatistics && (
        <>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
          {[
            { color: '#2e7d32', label: t('groupResults.scoreLegend.veryGood') },
            { color: '#6b9b70', label: t('groupResults.scoreLegend.good') },
            { color: '#a88916', label: t('groupResults.scoreLegend.fair') },
            { color: '#c27a3a', label: t('groupResults.scoreLegend.poor') },
            { color: '#c45b5b', label: t('groupResults.scoreLegend.veryPoor') },
          ].map(item => (
            <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Typography variant="body2" sx={{ color: item.color, fontWeight: 600 }}>{item.label}</Typography>
            </Box>
          ))}
        </Box>
        <TableContainer component={Paper} sx={{ width: '100%', marginBottom: '20px' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('groupResults.texts.round')}</TableCell>
                <TableCell>{t('groupResults.fields.group')}</TableCell>
                <TableCell>{t('groupResults.fields.genderRatioScore')}</TableCell>
                <TableCell>{t('groupResults.fields.targetAgeScore')}</TableCell>
                <TableCell>{t('groupResults.fields.groupmateRedundancyScore')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {
                (() => {
                  const allRoundGenderRatioScores = generatedGroups.map(round => round.reduce((sum, group) => sum + (group.statistics?.genderRatioScore || 0), 0) / round.length);
                  const allRoundTargetAgeScores = generatedGroups.map(round => round.reduce((sum, group) => sum + (group.statistics?.targetAgeScore || 0), 0) / round.length);
                  const allRoundGroupmateRedundancyScores = generatedGroups.map(round => round.reduce((sum, group) => sum + (group.statistics?.groupmateRedundancyScore || 0), 0) / round.length);

                  const overallGenderRatioScore = allRoundGenderRatioScores.reduce((sum, score) => sum + score, 0) / allRoundGenderRatioScores.length;
                  const overallTargetAgeScore = allRoundTargetAgeScores.reduce((sum, score) => sum + score, 0) / allRoundTargetAgeScores.length;
                  const overallGroupmateRedundancyScore = allRoundGroupmateRedundancyScores.reduce((sum, score) => sum + score, 0) / allRoundGroupmateRedundancyScores.length;

                  const overallWorstGenderRatioScore = Math.min(...generatedGroups.flatMap(round => round.map(group => group.statistics?.genderRatioScore || 0)));
                  const overallWorstTargetAgeScore = Math.min(...generatedGroups.flatMap(round => round.map(group => group.statistics?.targetAgeScore || 0)));
                  const overallWorstGroupmateRedundancyScore = Math.min(...generatedGroups.flatMap(round => round.map(group => group.statistics?.groupmateRedundancyScore || 0)));

                  return (
                    <>
                      <TableRow sx={{ fontWeight: 'bold' }}>
                        <TableCell>{t('groupResults.fields.average')}</TableCell>
                        <TableCell></TableCell>
                        <TableCell sx={scoreCellStyle(overallGenderRatioScore)}>{overallGenderRatioScore.toFixed(2)}</TableCell>
                        <TableCell sx={scoreCellStyle(overallTargetAgeScore)}>{overallTargetAgeScore.toFixed(2)}</TableCell>
                        <TableCell sx={scoreCellStyle(overallGroupmateRedundancyScore)}>{overallGroupmateRedundancyScore.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow sx={{ fontWeight: 'bold' }}>
                        <TableCell>{t('groupResults.fields.worst')}</TableCell>
                        <TableCell></TableCell>
                        <TableCell sx={scoreCellStyle(overallWorstGenderRatioScore)}>{overallWorstGenderRatioScore.toFixed(2)}</TableCell>
                        <TableCell sx={scoreCellStyle(overallWorstTargetAgeScore)}>{overallWorstTargetAgeScore.toFixed(2)}</TableCell>
                        <TableCell sx={scoreCellStyle(overallWorstGroupmateRedundancyScore)}>{overallWorstGroupmateRedundancyScore.toFixed(2)}</TableCell>
                      </TableRow>
                    </>
                  );
                })()
              }
              {generatedGroups.map((round, roundIndex) => {
                const roundGenderRatioScore = round.reduce((sum, group) => sum + (group.statistics?.genderRatioScore || 0), 0) / round.length;
                const roundTargetAgeScore = round.reduce((sum, group) => sum + (group.statistics?.targetAgeScore || 0), 0) / round.length;
                const roundGroupmateRedundancyScore = round.reduce((sum, group) => sum + (group.statistics?.groupmateRedundancyScore || 0), 0) / round.length;

                const roundWorstGenderRatioScore = Math.min(...round.map(group => group.statistics?.genderRatioScore || 0));
                const roundWorstTargetAgeScore = Math.min(...round.map(group => group.statistics?.targetAgeScore || 0));
                const roundWorstGroupmateRedundancyScore = Math.min(...round.map(group => group.statistics?.groupmateRedundancyScore || 0));

                return (
                  <React.Fragment key={roundIndex}>
                    {round.map((group: Group, groupIndex: number) => (
                      <TableRow
                        key={`${roundIndex}-${group.id}`}
                        role="link"
                        tabIndex={0}
                        aria-label={t('groupResults.texts.goToGroup', { round: roundIndex + 1, group: group.id })}
                        onClick={() => scrollToGroup(roundIndex, group.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            scrollToGroup(roundIndex, group.id);
                          }
                        }}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' },
                          '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: '-3px' },
                        }}
                      >
                        {groupIndex === 0 && (
                          <TableCell rowSpan={round.length + 2} sx={{ verticalAlign: 'top' }}>
                            {t('groupResults.texts.round')} {roundIndex + 1}
                          </TableCell>
                        )}
                        <TableCell>{group.id}</TableCell>
                        <TableCell sx={scoreCellStyle(group.statistics?.genderRatioScore || 0)}>{(group.statistics?.genderRatioScore || 0).toFixed(2)}</TableCell>
                        <TableCell sx={scoreCellStyle(group.statistics?.targetAgeScore || 0)}>{(group.statistics?.targetAgeScore || 0).toFixed(2)}</TableCell>
                        <TableCell sx={scoreCellStyle(group.statistics?.groupmateRedundancyScore || 0)}>{(group.statistics?.groupmateRedundancyScore || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ fontWeight: 'bold' }}>
                      <TableCell>{t('groupResults.fields.average')}</TableCell>
                      <TableCell sx={scoreCellStyle(roundGenderRatioScore)}>{roundGenderRatioScore.toFixed(2)}</TableCell>
                      <TableCell sx={scoreCellStyle(roundTargetAgeScore)}>{roundTargetAgeScore.toFixed(2)}</TableCell>
                      <TableCell sx={scoreCellStyle(roundGroupmateRedundancyScore)}>{roundGroupmateRedundancyScore.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow sx={{ fontWeight: 'bold' }}>
                      <TableCell>{t('groupResults.fields.worst')}</TableCell>
                      <TableCell sx={scoreCellStyle(roundWorstGenderRatioScore)}>{roundWorstGenderRatioScore.toFixed(2)}</TableCell>
                      <TableCell sx={scoreCellStyle(roundWorstTargetAgeScore)}>{roundWorstTargetAgeScore.toFixed(2)}</TableCell>
                      <TableCell sx={scoreCellStyle(roundWorstGroupmateRedundancyScore)}>{roundWorstGroupmateRedundancyScore.toFixed(2)}</TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TableContainer component={Paper} sx={{ width: '100%', marginBottom: '20px' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('groupResults.fields.uniquePairCoverage')}</TableCell>
                <TableCell>{t('groupResults.fields.repeatCost')}</TableCell>
                <TableCell>{t('groupResults.fields.worstPairFrequency')}</TableCell>
                <TableCell>{t('groupResults.fields.averageExposure')}</TableCell>
                <TableCell>{t('groupResults.fields.minimumExposure')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={scoreCellStyle(scheduleMetrics.uniquePairCoverage)}>{scheduleMetrics.uniquePairCoverage.toFixed(2)}</TableCell>
                <TableCell>{scheduleMetrics.repeatCost}</TableCell>
                <TableCell>{scheduleMetrics.worstPairFrequency}</TableCell>
                <TableCell>{scheduleMetrics.averageExposure.toFixed(2)}</TableCell>
                <TableCell>{scheduleMetrics.minimumExposure}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        </>
      )}
      {generatedGroups.map((round, roundIndex) => (
        <Box key={roundIndex} sx={{ marginTop: '20px' }}>
          <Typography variant="h6">{t('groupResults.texts.round')} {roundIndex + 1}</Typography>
          {round.map((group: Group) => (
            <Box id={groupElementId(roundIndex, group.id)} key={group.id} sx={{ marginTop: '10px', scrollMarginTop: '16px' }}>
              <Typography>{t('groupResults.fields.group')} {group.id} {showAverageAge && `(${t('groupResults.fields.averageAge')}: ${getAverageAge(group)})`}</Typography>
              <TableContainer component={Paper} sx={{ width: '100%' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      {displayColumns.map(column => (
                        <TableCell key={column}>{column.charAt(0).toUpperCase() + column.slice(1)}</TableCell>
                      ))}
                      {showTargetAgeColumn && <TableCell>{t('groupResults.fields.targetAge')}</TableCell>}
                      <TableCell colSpan={2}>{t('groupResults.fields.repeatedGroupmateCount')}</TableCell>
                      {groupSettings.splitByTargetAge && <TableCell colSpan={2}>{t('groupResults.fields.unmetTargetAgeGroupmateCount')}</TableCell>}
                      {groupSettings.splitByTargetAge && <TableCell>{t('groupResults.fields.ageSatisfactionScore')}</TableCell>}
                    </TableRow>
                    <TableRow>
                      {displayColumns.length > 0 && <TableCell colSpan={displayColumns.length + (showTargetAgeColumn ? 1 : 0)}></TableCell>}
                      <TableCell>{t('groupResults.texts.perRound')}</TableCell>
                      <TableCell>{t('groupResults.texts.total')}</TableCell>
                      {groupSettings.splitByTargetAge && (
                        <>
                          <TableCell>{t('groupResults.texts.perRound')}</TableCell>
                          <TableCell>{t('groupResults.texts.total')}</TableCell>
                          <TableCell></TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.participants.map((participant) => (
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
                        {showTargetAgeColumn && <TableCell>{participant.targetAge}</TableCell>}
                        <TableCell>{participant.statistics.repeatedGroupmateCount}</TableCell>
                        <TableCell>{participant.statistics.accumulatedRepeatedGroupmateCount}</TableCell>
                        {groupSettings.splitByTargetAge && <TableCell>{participant.statistics.unmetTargetAgeGroupmateCount}</TableCell>}
                        {groupSettings.splitByTargetAge && <TableCell>{participant.statistics.accumulatedUnmetTargetAgeGroupmateCounts}</TableCell>}
                        {groupSettings.splitByTargetAge && <TableCell>{participant.statistics.ageSatisfactionScore?.toFixed(2) ?? '—'}</TableCell>}
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
