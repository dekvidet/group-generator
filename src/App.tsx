import React from 'react';
import { Container, Typography } from '@mui/material';
import CsvUploader from './CsvUploader';
import ColumnMapper from './ColumnMapper';
import StatisticsTables from './StatisticsTables';
import GroupGenerator from './GroupGenerator';
import GroupResults from './GroupResults';

const App: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Team Generator
      </Typography>
      <CsvUploader />
      <ColumnMapper />
      <StatisticsTables />
      <GroupGenerator />
      <GroupResults />
    </Container>
  );
};

export default App;