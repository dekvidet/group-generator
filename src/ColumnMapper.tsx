
import React, { useState } from 'react';
import { useStore } from './store';
import { Box, FormControl, InputLabel, Select, MenuItem, Typography, TextField, Button, Checkbox, ListItemText } from '@mui/material';
import Papa from 'papaparse';

const ColumnMapper: React.FC = () => {
  const { headers, uniqueValues, mappedColumns, setMappedColumns, setProcessedData, setParticipantRatios, setAgeGroups, file, setMaleValues, setFemaleValues, setGroupLeaderValues, setTargetAgeRanges, maleValues, femaleValues, groupLeaderValues, targetAgeRanges, displayColumns, setDisplayColumns } = useStore();

  const handleChange = (field: string, value: any) => {
    setMappedColumns({ [field]: value });
  };

  const handleProcess = () => {
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const data = (results.data as any[]).map(row => {
            const newRow: any = {};
            // Include all original CSV headers in newRow
            headers.forEach(header => {
              newRow[header] = row[header];
            });
            // Then, apply the specific mappings for internal fields
            Object.keys(mappedColumns).forEach(field => {
              const csvHeader = mappedColumns[field];
              if (csvHeader) {
                newRow[field] = row[csvHeader];
              }
            });
            return newRow;
          });
          setProcessedData(data);

          // Calculate statistics
          const participantRatios = {
            men: { all: 0, leaders: 0 },
            women: { all: 0, leaders: 0 },
          };

          const ageGroups: Record<string, { men: number, women: number }> = {};
          targetAgeRanges.forEach(range => {
            ageGroups[range.name] = { men: 0, women: 0 };
          });

          data.forEach(row => {
            if (maleValues.includes(row.gender)) {
              participantRatios.men.all++;
              if (groupLeaderValues.includes(row.isGroupLeader)) {
                participantRatios.men.leaders++;
              }
            } else if (femaleValues.includes(row.gender)) {
              participantRatios.women.all++;
              if (groupLeaderValues.includes(row.isGroupLeader)) {
                participantRatios.women.leaders++;
              }
            }

            // Age group statistics
            const age = parseInt(row.age);
            targetAgeRanges.forEach(range => {
              if (age >= parseInt(range.from) && age <= parseInt(range.to)) {
                if (maleValues.includes(row.gender)) {
                  ageGroups[range.name].men++;
                } else if (femaleValues.includes(row.gender)) {
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
      <Typography variant="h6">Map Columns</Typography>
      {Object.keys(mappedColumns).filter(field => field !== 'firstName' && field !== 'lastName' && field !== 'email').map(field => (
        <React.Fragment key={field}>
          <FormControl fullWidth sx={{ marginTop: '10px', width: '100%' }}>
            <InputLabel id={`${field}-label`}>{field.charAt(0).toUpperCase() + field.slice(1)}</InputLabel>
            <Select labelId={`${field}-label`} value={mappedColumns[field] || ''} onChange={(e) => handleChange(field, e.target.value)} label={field.charAt(0).toUpperCase() + field.slice(1)}>
              {headers.map(header => (
                <MenuItem key={header} value={header}>{header}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {field === 'gender' && mappedColumns.gender && (
            <Box sx={{ marginLeft: '20px', marginTop: '10px' }}>
              <FormControl fullWidth>
                <InputLabel id="male-values-label">Male</InputLabel>
                <Select multiple value={maleValues} onChange={(e) => setMaleValues(e.target.value as string[])} renderValue={(selected) => (selected as string[]).join(', ')} labelId="male-values-label" label="Male">
                  {uniqueValues[mappedColumns.gender]?.map(value => (
                    <MenuItem key={value} value={value}>
                      <Checkbox checked={maleValues.indexOf(value) > -1} />
                      <ListItemText primary={value} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ marginTop: '10px' }}>
                <InputLabel id="female-values-label">Female</InputLabel>
                <Select multiple value={femaleValues} onChange={(e) => setFemaleValues(e.target.value as string[])} renderValue={(selected) => (selected as string[]).join(', ')} labelId="female-values-label" label="Female">
                  {uniqueValues[mappedColumns.gender]?.map(value => (
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
              <Typography>Target Age Ranges</Typography>
              {targetAgeRanges.map((range, index) => (
                <Box key={index} sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: '10px', marginTop: '10px' }}>
                  <TextField label="From" value={range.from} onChange={(e) => { const newRanges = [...targetAgeRanges]; newRanges[index].from = e.target.value; setTargetAgeRanges(newRanges); }} />
                  <TextField label="To" value={range.to} onChange={(e) => { const newRanges = [...targetAgeRanges]; newRanges[index].to = e.target.value; setTargetAgeRanges(newRanges); }} />
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel id="target-age-name-label">Name</InputLabel>
                    <Select
                      labelId="target-age-name-label"
                      value={range.name}
                      onChange={(e) => { const newRanges = [...targetAgeRanges]; newRanges[index].name = e.target.value; setTargetAgeRanges(newRanges); }}
                      label="Name"
                    >
                      {uniqueValues[mappedColumns.targetAge]?.map(value => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              ))}
              <Button onClick={() => setTargetAgeRanges([...targetAgeRanges, { from: '', to: '', name: '' }])}>Add Range</Button>
            </Box>
          )}

          {field === 'isGroupLeader' && mappedColumns.isGroupLeader && (
            <Box sx={{ marginLeft: '20px', marginTop: '10px' }}>
              <FormControl fullWidth>
                <InputLabel id="group-leader-values-label">Group Leader Values</InputLabel>
                <Select multiple value={groupLeaderValues} onChange={(e) => setGroupLeaderValues(e.target.value as string[])} renderValue={(selected) => (selected as string[]).join(', ')} labelId="group-leader-values-label" label="Group Leader Values">
                  {uniqueValues[mappedColumns.isGroupLeader]?.map(value => (
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

      

      <Button variant="contained" sx={{ marginTop: '20px' }} onClick={handleProcess}>Process</Button>
    </Box>
  );
};

export default ColumnMapper;
