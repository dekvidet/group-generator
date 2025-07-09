import React from 'react';
import { useStore } from './store';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const StatisticsTables: React.FC = () => {
  const { participantRatios, ageGroups, maleValues, femaleValues } = useStore();

  if (!participantRatios) {
    return null;
  }

  return (
    <Box sx={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
      <Box>
        <Typography variant="h6">Participant Ratios</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                <TableCell>All Participants</TableCell>
                <TableCell>Team Leaders</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Men</TableCell>
                <TableCell>{participantRatios.men.all}</TableCell>
                <TableCell>{participantRatios.men.leaders}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Women</TableCell>
                <TableCell>{participantRatios.women.all}</TableCell>
                <TableCell>{participantRatios.women.leaders}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell>{participantRatios.men.all + participantRatios.women.all}</TableCell>
                <TableCell>{participantRatios.men.leaders + participantRatios.women.leaders}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <Box>
        <Typography variant="h6">Age Groups</Typography>
        <TableContainer component={Paper}>
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
                <TableCell>Men</TableCell>
                {Object.keys(ageGroups).map(rangeName => (
                  <TableCell key={rangeName}>{ageGroups[rangeName].men}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>Women</TableCell>
                {Object.keys(ageGroups).map(rangeName => (
                  <TableCell key={rangeName}>{ageGroups[rangeName].women}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>Total</TableCell>
                {Object.keys(ageGroups).map(rangeName => (
                  <TableCell key={rangeName}>{ageGroups[rangeName].men + ageGroups[rangeName].women}</TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default StatisticsTables;