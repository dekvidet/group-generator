
import React from 'react';
import { useStore } from '../../../store';
import { Box, FormControl, InputLabel, Select, MenuItem, Typography, TextField, Button, Checkbox, ListItemText, Alert } from '@mui/material';
import Papa from 'papaparse';
import { useTranslation } from 'react-i18next';

const ColumnMapper: React.FC = () => {
  const { headers, uniqueValues, mappedColumns, setMappedColumns, setProcessedData, setParticipantRatios, setAgeGroups, file, setMaleValues, setFemaleValues, setGroupLeaderValues, setTargetAgeRanges, maleValues, femaleValues, groupLeaderValues, targetAgeRanges } = useStore();
  const { t } = useTranslation();

  const handleChange = (field: string, value: string | null) => {
    setMappedColumns({ [field]: value });
  };

  const handleProcess = () => {
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<any>) => {
          console.log(results)
          const data = results.data.filter(row => row[mappedColumns.id as string]).map(row => {
            const newRow: { [key: string]: any } = {};
            // Include all original CSV headers in newRow
            headers.forEach(header => {
              newRow[header] = row[header];
            });
            // Then, apply the specific mappings for internal fields
            Object.keys(mappedColumns).forEach(field => {
              const csvHeader = mappedColumns[field];
              if (csvHeader) {
                if (field === 'isGroupLeader') {
                  newRow[field] = groupLeaderValues.includes(row[csvHeader]);
                } else {
                  newRow[field] = row[csvHeader];
                }
              }
            });
            return newRow;
          });
          setProcessedData(data);

          // Calculate statistics
          const participantRatios = {
            men: { all: 0, leaders: 0 },
            women: { all: 0, leaders: 0 },
            unknown: { all: 0, leaders: 0 },
          };

          const ageGroups: Record<string, { men: number, women: number }> = {};
          targetAgeRanges.forEach(range => {
            ageGroups[range.name] = { men: 0, women: 0 };
          });

          data.forEach(row => {
            if (mappedColumns.gender && maleValues.includes(row.gender)) {
              participantRatios.men.all++;
              if (mappedColumns.isGroupLeader && groupLeaderValues.includes(row.isGroupLeader)) {
                participantRatios.men.leaders++;
              }
            } else if (mappedColumns.gender && femaleValues.includes(row.gender)) {
              participantRatios.women.all++;
              if (mappedColumns.isGroupLeader && groupLeaderValues.includes(row.isGroupLeader)) {
                participantRatios.women.leaders++;
              }
            } else {
              participantRatios.unknown.all++;
              if (mappedColumns.isGroupLeader && groupLeaderValues.includes(row.isGroupLeader)) {
                participantRatios.unknown.leaders++;
              }
            }

            // Age group statistics
            const age = parseInt(row.age);
            targetAgeRanges.forEach(range => {
              if (age >= parseInt(range.from) && age <= parseInt(range.to)) {
                if (mappedColumns.gender && maleValues.includes(row.gender)) {
                  ageGroups[range.name].men++;
                } else if (mappedColumns.gender && femaleValues.includes(row.gender)) {
                  ageGroups[range.name].women++;
                }
              }
            });
          });

          setParticipantRatios(participantRatios);
          setAgeGroups(ageGroups);
        },
      });
    }
  };

  if (headers.length === 0) {
    return null;
  }

  return (
    <Box sx={{ marginTop: '20px' }}>
      <Typography variant="h6">{t('mapColumns.texts.header')}</Typography>
      <Typography variant="body2" sx={{ marginBottom: '20px' }}>{t('mapColumns.texts.subHeader')}</Typography>
      {Object.keys(mappedColumns).filter(field => field !== 'firstName' && field !== 'lastName' && field !== 'email').map(field => (
        <React.Fragment key={field}>
          <FormControl fullWidth sx={{ marginTop: '10px', width: '100%' }}>
            <InputLabel id={`${field}-label`}>{t(`mapColumns.fields.${field}`)}</InputLabel>
            <Select labelId={`${field}-label`} value={mappedColumns[field] || ''} onChange={(e) => handleChange(field, e.target.value)} label={t(`mapColumns.fields.${field}`)}>
              {headers.map(header => (
                <MenuItem key={header} value={header}>{header}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {field === 'gender' && mappedColumns.gender && (
            <Box sx={{ marginLeft: '20px', marginTop: '10px' }}>
              <FormControl fullWidth>
                <InputLabel id="male-values-label">{t('mapColumns.fieldValues.male')}</InputLabel>
                <Select multiple value={maleValues} onChange={(e) => setMaleValues(e.target.value as string[])} renderValue={(selected) => (selected as string[]).join(', ')} labelId="male-values-label" label={t('mapColumns.fieldValues.male')}>
                  {uniqueValues[mappedColumns.gender as string]?.map((value: string) => (
                    <MenuItem key={value} value={value}>
                      <Checkbox checked={maleValues.indexOf(value) > -1} />
                      <ListItemText primary={value} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ marginTop: '10px' }}>
                <InputLabel id="female-values-label">{t('mapColumns.fieldValues.female')}</InputLabel>
                <Select multiple value={femaleValues} onChange={(e) => setFemaleValues(e.target.value as string[])} renderValue={(selected) => (selected as string[]).join(', ')} labelId="female-values-label" label={t('mapColumns.fieldValues.female')}>
                  {uniqueValues[mappedColumns.gender as string]?.map((value: string) => (
                    <MenuItem key={value} value={value}>
                      <Checkbox checked={femaleValues.indexOf(value) > -1} />
                      <ListItemText primary={value} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {field === 'targetAge' && mappedColumns.targetAge && (
            <Box sx={{ marginLeft: '20px', marginTop: '10px' }}>
              <Alert variant="filled" severity="info">
                {t('mapColumns.texts.ageGroupInfo')}
              </Alert>
              {targetAgeRanges.map((range, index) => (
                <Box key={index} sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: '10px', marginTop: '10px' }}>
                  <TextField label={t('mapColumns.fields.from')} value={range.from} onChange={(e) => { const newRanges = [...targetAgeRanges]; newRanges[index].from = e.target.value; setTargetAgeRanges(newRanges); }} />
                  <TextField label={t('mapColumns.fields.to')} value={range.to} onChange={(e) => { const newRanges = [...targetAgeRanges]; newRanges[index].to = e.target.value; setTargetAgeRanges(newRanges); }} />
                  <FormControl sx={{ minWidth: 250 }}>
                    <InputLabel id="target-age-name-label">{t('mapColumns.fields.value')}</InputLabel>
                    <Select
                      labelId="target-age-name-label"
                      value={range.name}
                      onChange={(e) => { const newRanges = [...targetAgeRanges]; newRanges[index].name = e.target.value; setTargetAgeRanges(newRanges); }}
                      label={t('mapColumns.fields.value')}
                    >
                      {uniqueValues[mappedColumns.targetAge as string]?.map((value: string) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              ))}
              <Button onClick={() => setTargetAgeRanges([...targetAgeRanges, { from: '', to: '', name: '' }])}>{t('mapColumns.fields.addRange')}</Button>
            </Box>
          )}

          {field === 'isGroupLeader' && mappedColumns.isGroupLeader && (
            <Box sx={{ marginLeft: '20px', marginTop: '10px' }}>
              <FormControl fullWidth>
                <InputLabel id="group-leader-values-label">{t('mapColumns.fieldValues.isGroupLeader')}</InputLabel>
                <Select multiple value={groupLeaderValues} onChange={(e) => setGroupLeaderValues(e.target.value as string[])} renderValue={(selected) => (selected as string[]).join(', ')} labelId="group-leader-values-label" label={t('mapColumns.fieldValues.isGroupLeader')}>
                  {uniqueValues[mappedColumns.isGroupLeader as string]?.map((value: string) => (
                    <MenuItem key={value} value={value}>
                      <Checkbox checked={groupLeaderValues.indexOf(value) > -1} />
                      <ListItemText primary={value} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </React.Fragment>
      ))}

      

      <Button variant="contained" sx={{ marginTop: '20px' }} onClick={handleProcess}>{t('mapColumns.fields.process')}</Button>
    </Box>
  );
};

export default ColumnMapper;
