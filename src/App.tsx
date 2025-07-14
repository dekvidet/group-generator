import React from 'react';
import { Container, Typography, Box, Tabs, Tab } from '@mui/material';
import GeneratorPage from './pages/generator/GeneratorPage';
import PresentPage from './pages/present/PresentPage';
import DisplayPage from './pages/display/DisplayPage';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

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
        <Box sx={{ borderBottom: 1, borderColor: 'divider', marginBottom: 2 }}>
          <Tabs value={location.pathname}>
            <Tab label="Generator" value="/" to="/" component={Link} />
            <Tab label="Presenter" value="/present" to="/present" component={Link} />
          </Tabs>
        </Box>
        <Routes>
          <Route path="/" element={<GeneratorPage />} />
          <Route path="/present" element={<PresentPage />} />
          <Route path="/display" element={<DisplayPage />} />
        </Routes>
      </Box>
    </Container>
  );
}

const App: React.FC = () => {
  return (
    <Router>
      <AppRouterContent />
    </Router>
  );
};

const AppRouterContent: React.FC = () => {
  const location = useLocation();

  if (location.pathname === '/display') {
    return (
      <Routes>
        <Route path="/display" element={<DisplayPage />} />
      </Routes>
    );
  }

  return <AppContent />;
};

export default App;