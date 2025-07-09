import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import CsvUploader from './CsvUploader';
import ColumnMapper from './ColumnMapper';
import StatisticsTables from './StatisticsTables';
import GroupGenerator from './GroupGenerator';
import GroupResults from './GroupResults';

const App: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ my: 4, width: '100%' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Team Generator
        </Typography>
        <CsvUploader />
        <ColumnMapper />
        <StatisticsTables />
        <GroupGenerator />
        <GroupResults />
      </Box>
    </Container>
  );
};

export default App;