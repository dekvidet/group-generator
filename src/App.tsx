import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import CsvUploader from './CsvUploader';
import ColumnMapper from './ColumnMapper';
import StatisticsTables from './StatisticsTables';
import GroupGenerator from './GroupGenerator';
import GroupResults from './GroupResults';
import { useTranslation } from 'react-i18next';

const App: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Container maxWidth="xl" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ my: 4, width: '100%' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('app.title')}
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