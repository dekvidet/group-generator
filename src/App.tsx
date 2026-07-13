import React from 'react';
import { Container, Typography, Box, Tabs, Tab } from '@mui/material';
import GeneratorPage from './pages/generator/GeneratorPage';
import PresentPage from './pages/present/PresentPage';
import DisplayPage from './pages/display/DisplayPage';
import ViewPage from './pages/view/ViewPage';
import { useTranslation } from 'react-i18next';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import LanguageSelector from './components/LanguageSelector';

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <Container maxWidth="xl" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ my: 4, width: '100%', position: 'relative' }}>
        <Box sx={{ position: 'absolute', top: 0, right: 0 }}>
          <LanguageSelector />
        </Box>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('app.title')}
        </Typography>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', marginBottom: 2 }}>
          <Tabs value={location.pathname}>
            <Tab label="Generator" value="/" to="/" component={Link} />
            <Tab label="Presenter" value="/present" to="/present" component={Link} />
            <Tab label={t('viewPage.tab')} value="/view" to="/view" component={Link} />
          </Tabs>
        </Box>
        <Routes>
          <Route path="/" element={<GeneratorPage />} />
          <Route path="/present" element={<PresentPage />} />
          <Route path="/display" element={<DisplayPage />} />
          <Route path="/view" element={<ViewPage />} />
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

  if (location.pathname === '/view') {
    return (
      <Routes>
        <Route path="/view" element={<ViewPage />} />
      </Routes>
    );
  }

  return <AppContent />;
};

export default App;