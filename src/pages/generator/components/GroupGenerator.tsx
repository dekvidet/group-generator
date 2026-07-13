
import React, { useState } from 'react';
import { useStore } from '../../../store';
import { Alert, Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Button, Chip, ListItemText } from '@mui/material';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import type { Group, Participant, ParticipantWithStatistics } from '../../../types';
import { calculateGenderRatioScore, calculateGroupmateRedundancyScore, calculateParticipantAgeSatisfaction, calculateRepeatedGroupmateCount, calculateTargetAgeScore, calculateUnmetTargetAgeGroupmateCount, optimizeGroups, type MeetingCounts, type OptimizationSettings } from './GroupGeneration';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return window.btoa(binary);
}

async function fetchFontAsBase64(fileName: string): Promise<string> {
  const response = await fetch(`${import.meta.env.BASE_URL}fonts/${fileName}`);
  if (!response.ok) throw new Error(`Could not load PDF font: ${fileName}`);
  return arrayBufferToBase64(await response.arrayBuffer());
}

const GroupGenerator: React.FC = () => {
  const { groupSettings, setGroupSettings, processedData, setGeneratedGroups, maleValues, femaleValues, targetAgeRanges, generatedGroups, displayColumns, setDisplayColumns, headers, mappedColumns, resetGroupSettings } = useStore();
  const { t } = useTranslation();
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleChange = (field: string, value: any) => {
    setGroupSettings({ [field]: value });
  };

  function addStatistics(participant: Participant): ParticipantWithStatistics {
    return ({
      ...participant,
      statistics: {
        repeatedGroupmateCount: 0,
        unmetTargetAgeGroupmateCount: 0,
        accumulatedRepeatedGroupmateCount: 0,
        accumulatedUnmetTargetAgeGroupmateCounts: 0,
        ageSatisfactionScore: null,
      }
    })
  }

  const handleGenerateGroups = () => {
    setGenerationError(null);
    try {
      const allParticipants = processedData as Participant[];
      const optimized = optimizeGroups(allParticipants, groupSettings as OptimizationSettings, maleValues, femaleValues, targetAgeRanges);
      const priorMeetings: MeetingCounts = {};
      const accumulatedUnmet: Record<string, number> = {};
      const accumulatedRepeated: Record<string, number> = {};
      const totalMaleCount = allParticipants.filter(participant => maleValues.includes(participant.gender)).length;
      const totalFemaleCount = allParticipants.filter(participant => femaleValues.includes(participant.gender)).length;

      const rounds = optimized.rounds.map((optimizedRound) => {
        const groups: Group[] = optimizedRound.map((participants, groupIndex) => ({
          id: groupIndex + 1,
          participants: participants.map(addStatistics),
        }));

        for (const group of groups) {
          group.participants = group.participants.map(participant => {
            const repeatedGroupmateCount = calculateRepeatedGroupmateCount(group, participant, priorMeetings);
            const unmetTargetAgeGroupmateCount = calculateUnmetTargetAgeGroupmateCount(group, participant, targetAgeRanges);
            accumulatedRepeated[participant.id] = (accumulatedRepeated[participant.id] ?? 0) + repeatedGroupmateCount;
            accumulatedUnmet[participant.id] = (accumulatedUnmet[participant.id] ?? 0) + unmetTargetAgeGroupmateCount;
            return {
              ...participant,
              statistics: {
                repeatedGroupmateCount,
                unmetTargetAgeGroupmateCount,
                accumulatedRepeatedGroupmateCount: accumulatedRepeated[participant.id],
                accumulatedUnmetTargetAgeGroupmateCounts: accumulatedUnmet[participant.id],
                ageSatisfactionScore: calculateParticipantAgeSatisfaction(participant, group, targetAgeRanges),
              },
            };
          });
          group.statistics = {
            genderRatioScore: calculateGenderRatioScore(group, maleValues, femaleValues, totalMaleCount, totalFemaleCount),
            targetAgeScore: calculateTargetAgeScore(group, targetAgeRanges),
            groupmateRedundancyScore: calculateGroupmateRedundancyScore(group, priorMeetings),
          };
        }

        for (const group of groups) {
          for (const participant of group.participants) {
            priorMeetings[participant.id] ??= new Map();
            for (const groupmate of group.participants) {
              if (participant.id !== groupmate.id) {
                const previousCount = priorMeetings[participant.id].get(groupmate.id) ?? 0;
                priorMeetings[participant.id].set(groupmate.id, previousCount + 1);
              }
            }
          }
        }
        return groups;
      });
      setGeneratedGroups(rounds);
    } catch (error) {
      setGeneratedGroups([]);
      setGenerationError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleDownload = () => {
    const wb = XLSX.utils.book_new();

    const ws_data: any[][] = [[]];
    displayColumns.forEach(col => ws_data[0].push(col));
    ws_data[0].push(t('groupGenerator.texts.groupLeaderColumn'));

    const maxRound = generatedGroups.length; // Total number of rounds
    for (let i = 0; i < maxRound; i++) {
      ws_data[0].push(t('groupGenerator.texts.roundHeader', { round: i + 1 }));
    }

    const allParticipants = new Map<string, any>(); // Map to store unique participants and their group assignments across all rounds

    generatedGroups.forEach((round, roundIndex) => {
      round.forEach((group: Group) => {
        group.participants.forEach((participant: Participant) => {
          if (!allParticipants.has(participant.id)) {
            allParticipants.set(participant.id, {
              isLeader: participant.isGroupLeader ? 'X' : '',
              groups: new Array(maxRound).fill(''), // Initialize with empty strings for all rounds
              data: participant
            });
          }
          allParticipants.get(participant.id).groups[roundIndex] = group.id;
        });
      });
    });

    allParticipants.forEach((value, _key) => {
      const row: any[] = [];
      displayColumns.forEach(col => row.push(value.data[col]));
      row.push(value.isLeader);
      for (let i = 0; i < maxRound; i++) {
        row.push(value.groups[i]);
      }
      ws_data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'All Rounds');

    XLSX.writeFile(wb, t('groupGenerator.texts.excelFileName'));
  };

  const prepareDataForDownload = (sortByName = false) => {
    const ws_data: any[][] = [[]];
    displayColumns.forEach(col => ws_data[0].push(col));
    ws_data[0].push(t('groupGenerator.texts.groupLeaderColumn'));

    const maxRound = generatedGroups.length; // Total number of rounds
    for (let i = 0; i < maxRound; i++) {
      ws_data[0].push(t('groupGenerator.texts.roundHeader', { round: i + 1 }));
    }

    const allParticipants = new Map<string, any>(); // Map to store unique participants and their group assignments across all rounds

    generatedGroups.forEach((round, roundIndex) => {
      round.forEach((group: Group) => {
        group.participants.forEach((participant: Participant) => {
          if (!allParticipants.has(participant.id)) {
            allParticipants.set(participant.id, {
              isLeader: participant.isGroupLeader ? 'X' : '',
              groups: new Array(maxRound).fill(''), // Initialize with empty strings for all rounds
              data: participant
            });
          }
          allParticipants.get(participant.id).groups[roundIndex] = group.id;
        });
      });
    });

    const participantRows = [...allParticipants.values()];
    if (sortByName) {
      const familyNameColumn = mappedColumns.familyName;
      const otherNameColumns = displayColumns.filter(column => {
        if (column === familyNameColumn) return false;
        const normalized = column.toLocaleLowerCase('hu');
        return /(name|név|kereszt|first|given|utó)/u.test(normalized);
      });
      const secondaryColumns = otherNameColumns.length > 0
        ? otherNameColumns
        : displayColumns.filter(column => column !== familyNameColumn).slice(0, 1);
      const sortText = (value: { data: Participant }, columns: string[]) =>
        columns.map(column => String(value.data[column] ?? '')).join(' ').trim();

      participantRows.sort((first, second) => {
        const firstFamilyName = String(first.data.familyName ?? (familyNameColumn ? first.data[familyNameColumn] : '') ?? '');
        const secondFamilyName = String(second.data.familyName ?? (familyNameColumn ? second.data[familyNameColumn] : '') ?? '');
        const familyComparison = firstFamilyName.localeCompare(secondFamilyName, 'hu', { sensitivity: 'base', numeric: true });
        if (familyComparison !== 0) return familyComparison;
        return sortText(first, secondaryColumns).localeCompare(sortText(second, secondaryColumns), 'hu', { sensitivity: 'base', numeric: true });
      });
    }

    participantRows.forEach((value) => {
      const row: any[] = [];
      displayColumns.forEach(col => row.push(value.data[col]));
      row.push(value.isLeader);
      for (let i = 0; i < maxRound; i++) {
        row.push(value.groups[i]);
      }
      ws_data.push(row);
    });
    return ws_data;
  };

  

  const handleDownloadCsv = () => {
    const ws_data = prepareDataForDownload();
    const csv = Papa.unparse(ws_data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // feature detection
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', t('groupGenerator.texts.csvFileName'));
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadPdf = async () => {
    setGenerationError(null);
    try {
      const [{ jsPDF }, { default: autoTable }, regularFont, boldFont] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        fetchFontAsBase64('LiberationSans-Regular.ttf'),
        fetchFontAsBase64('LiberationSans-Bold.ttf'),
      ]);
      const data = prepareDataForDownload(true);
      const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', putOnlyUsedFonts: true });
      document.addFileToVFS('LiberationSans-Regular.ttf', regularFont);
      document.addFont('LiberationSans-Regular.ttf', 'LiberationSans', 'normal');
      document.addFileToVFS('LiberationSans-Bold.ttf', boldFont);
      document.addFont('LiberationSans-Bold.ttf', 'LiberationSans', 'bold');
      document.setFont('LiberationSans', 'normal');

      autoTable(document, {
        head: [data[0].map(value => String(value ?? ''))],
        body: data.slice(1).map(row => row.map(value => String(value ?? ''))),
        theme: 'grid',
        styles: {
          font: 'LiberationSans',
          fontStyle: 'normal',
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
          valign: 'middle',
          lineColor: [255, 255, 255],
          lineWidth: 0.6,
          minCellHeight: 8,
        },
        headStyles: {
          fillColor: [25, 118, 210],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          minCellHeight: 10,
        },
        bodyStyles: { fillColor: [245, 247, 250], textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [226, 232, 240] },
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        horizontalPageBreak: true,
        horizontalPageBreakRepeat: displayColumns.length > 1 ? [0, 1] : 0,
        didParseCell: ({ section, column, cell }) => {
          if (section === 'body') {
            cell.styles.halign = column.index < displayColumns.length ? 'left' : 'center';
          }
        },
      });
      document.save(t('groupGenerator.texts.pdfFileName'));
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : String(error));
    }
  };

  if (processedData.length === 0) {
    return null;
  }

  return (
    <Box sx={{ marginTop: '20px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <Typography variant="h6">{t('groupGenerator.texts.header')}</Typography>
        <Button variant="outlined" onClick={() => { resetGroupSettings(); setGenerationError(null); }}>{t('groupGenerator.texts.resetSettings')}</Button>
      </Box>
      <TextField label={t('groupGenerator.fields.groupSize')} type="number" fullWidth sx={{ marginTop: '10px' }} value={groupSettings.groupSize} onChange={(e) => handleChange('groupSize', parseInt(e.target.value))} />
      <TextField label={t('groupGenerator.fields.minLeaders')} type="number" fullWidth sx={{ marginTop: '10px' }} value={groupSettings.minLeaders} onChange={(e) => handleChange('minLeaders', parseInt(e.target.value))} />
      <TextField label={t('groupGenerator.fields.rounds')} type="number" fullWidth sx={{ marginTop: '10px' }} value={groupSettings.rounds} onChange={(e) => handleChange('rounds', parseInt(e.target.value))} />
      <FormControl fullWidth sx={{ marginTop: '10px' }}>
        <InputLabel id="shuffle-policy-label">{t('groupGenerator.fields.shufflePolicy')}</InputLabel>
        <Select labelId="shuffle-policy-label" value={groupSettings.shufflePolicy} onChange={(e) => handleChange('shufflePolicy', e.target.value)} label={t('groupGenerator.fields.shufflePolicy')}>
          <MenuItem value="unique">{t('groupGenerator.shufflePolicyOptions.unique')}</MenuItem>
          <MenuItem value="random">{t('groupGenerator.shufflePolicyOptions.random')}</MenuItem>
        </Select>
      </FormControl>
      <FormControlLabel control={<Checkbox checked={groupSettings.balanceGenders} onChange={(e) => handleChange('balanceGenders', e.target.checked)} />} label={t('groupGenerator.fields.balanceGenders')} />
      <FormControlLabel control={<Checkbox checked={groupSettings.splitByTargetAge} onChange={(e) => handleChange('splitByTargetAge', e.target.checked)} />} label={t('groupGenerator.fields.splitByTargetAge')} />
      <FormControlLabel control={<Checkbox checked={groupSettings.compulsoryGroupLeader} onChange={(e) => handleChange('compulsoryGroupLeader', e.target.checked)} />} label={t('groupGenerator.fields.compulsoryGroupLeader')} />
      <FormControlLabel control={<Checkbox checked={groupSettings.keepSiblingsApart} disabled={!mappedColumns.familyName} onChange={(e) => handleChange('keepSiblingsApart', e.target.checked)} />} label={t('groupGenerator.fields.keepSiblingsApart')} />
      <TextField label={t('groupGenerator.fields.optimizationSeed')} type="number" fullWidth sx={{ marginTop: '10px' }} value={groupSettings.optimizationSeed} onChange={(e) => handleChange('optimizationSeed', Number.parseInt(e.target.value, 10))} />
      <FormControl fullWidth sx={{ marginTop: '10px' }}>
        <InputLabel id="columns-to-display-label">{t('groupGenerator.fields.columnsToDisplay')}</InputLabel>
        <Select
          multiple
          labelId="columns-to-display-label"
          value={displayColumns}
          onChange={(e) => setDisplayColumns(e.target.value as string[])}
          label={t('groupGenerator.fields.columnsToDisplay')}
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
        <Button variant="contained" onClick={handleGenerateGroups}>{t('groupGenerator.texts.generateGroups')}</Button>
        <Button variant="contained" onClick={handleDownload} disabled={generatedGroups.length === 0}>{t('groupGenerator.texts.downloadXls')}</Button>
        <Button variant="contained" onClick={handleDownloadCsv} disabled={generatedGroups.length === 0}>{t('groupGenerator.texts.downloadCsv')}</Button>
        <Button variant="contained" onClick={handleDownloadPdf} disabled={generatedGroups.length === 0}>{t('groupGenerator.texts.downloadPdf')}</Button>
      </Box>
      {generationError && <Alert severity="error" sx={{ marginTop: '10px' }}>{generationError}</Alert>}
    </Box>
  );
};

export default GroupGenerator;
