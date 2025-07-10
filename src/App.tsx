import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import CsvUploader from './CsvUploader';
import ColumnMapper from './ColumnMapper';
import StatisticsTables from './StatisticsTables';
import GroupGenerator from './GroupGenerator';
import GroupResults from './GroupResults';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const App: React.FC = () => {
  const { t } = useTranslation();

  const handleLanguageChange = (event: any) => {
    i18n.changeLanguage(event.target.value);
  };

  return (
    <Container maxWidth="xl" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ my: 4, width: '100%', position: 'relative' }}>
        <FormControl sx={{ position: 'absolute', top: 0, right: 0, minWidth: 120 }}>
          <InputLabel id="language-select-label">Language</InputLabel>
          <Select
            labelId="language-select-label"
            value={i18n.language.substring(0, 2)}
            label="Language"
            onChange={handleLanguageChange}
          >
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="hu">Hungarian</MenuItem>
          </Select>
        </FormControl>
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