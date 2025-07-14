import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Button, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import Papa from 'papaparse';
import { useStore } from '../../store';
import { useTranslation } from 'react-i18next';
import Dropzone from '../../components/Dropzone';
import darkTheme from '../../theme';

const PresentPage: React.FC = () => {
  const { presenterFile, setPresenterFile, headers, setHeaders } = useStore();
  const { t } = useTranslation();
  const [isLive, setIsLive] = useState(false);
  const [loop, setLoop] = useState(false);
  const [isAutoplaying, setIsAutoplaying] = useState(false);
  const [autoplayInterval, setAutoplayInterval] = useState(3000); // Default to 3 seconds
  const [shownPlayers, setShownPlayers] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [orderBy, setOrderBy] = useState('');
  const [presenterData, setPresenterData] = useState<any[]>([]);
  const [customThemeJson, setCustomThemeJson] = useState<string>(() => {
    const savedTheme = localStorage.getItem('customTheme');
    return savedTheme || JSON.stringify(darkTheme, null, 2);
  });
  const sharedWorker = useRef<SharedWorker | null>(null);

  const totalRows = presenterData.length || 0;
  const totalPages = Math.ceil(totalRows / shownPlayers);

  useEffect(() => {
    setCurrentPage(1);
  }, [presenterFile, shownPlayers]);

  useEffect(() => {
    if (sharedWorker.current && isLive) {
      const startIndex = (currentPage - 1) * shownPlayers;
      const endIndex = startIndex + shownPlayers;
      let dataToSend = presenterData.slice(startIndex, endIndex);

      if (orderBy) {
        dataToSend.sort((a, b) => {
          if (a[orderBy] < b[orderBy]) return -1;
          if (a[orderBy] > b[orderBy]) return 1;
          return 0;
        });
      }

      sharedWorker.current.port.postMessage({
        headers: headers,
        rows: dataToSend,
      });
    }
  }, [presenterData, currentPage, shownPlayers, headers, orderBy, isLive]);

  useEffect(() => {
    sharedWorker.current = new SharedWorker(new URL('../sharedWorker.js', import.meta.url), {
      name: 'team-generator-worker',
    });

    return () => {
      sharedWorker.current?.port.close();
    };
  }, []);

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setPresenterFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        const headers = results.meta.fields || [];
        setHeaders(headers);
        if (headers.length > 0) {
          setOrderBy(headers[0]);
        }
        setPresenterData(results.data);
      },
    });
  };

  const handleGoLive = () => {
    setIsLive((prevIsLive) => {
      const newIsLive = !prevIsLive;
      if (!newIsLive && sharedWorker.current) {
        // If going from live to not live, clear the display
        sharedWorker.current.port.postMessage({
          headers: [],
          rows: [],
        });
      }
      return newIsLive;
    });
  };

  const handleFirst = () => {
    setCurrentPage(1);
  };

  const handlePrevious = () => {
    const totalRows = presenterData.length || 0;
    const totalPages = Math.ceil(totalRows / shownPlayers);
    setCurrentPage((prevPage) => {
      if (loop) {
        return prevPage === 1 ? totalPages : prevPage - 1;
      } else {
        return Math.max(prevPage - 1, 1);
      }
    });
  };

  const handleNext = useCallback(() => {
    const totalRows = presenterData.length || 0;
    const totalPages = Math.ceil(totalRows / shownPlayers);
    setCurrentPage((prevPage) => {
      if (loop) {
        return (prevPage % totalPages) + 1;
      } else {
        return Math.min(prevPage + 1, totalPages);
      }
    });
  }, [loop, presenterData.length, shownPlayers]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    if (isAutoplaying) {
      intervalId = setInterval(() => {
        handleNext();
      }, autoplayInterval);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAutoplaying, autoplayInterval, handleNext]);

  const handleSaveCustomTheme = () => {
    if (sharedWorker.current) {
      try {
        const theme = JSON.parse(customThemeJson);
        localStorage.setItem('customTheme', customThemeJson);
        sharedWorker.current.port.postMessage({
          type: 'customTheme',
          theme: theme,
        });
      } catch (error) {
        console.error("Invalid JSON for custom theme:", error);
        alert("Invalid JSON for custom theme. Please check your input.");
      }
    }
  };

  const handleResetCustomTheme = () => {
    setCustomThemeJson(JSON.stringify(darkTheme, null, 2));
    localStorage.removeItem('customTheme');
    if (sharedWorker.current) {
      sharedWorker.current.port.postMessage({
        type: 'customTheme',
        theme: darkTheme,
      });
    }
  };

  const handleOpenDisplay = () => {
    window.open(window.location.origin + window.location.pathname + '#/display', '_blank');
  };

  return (
    <Box sx={{ marginTop: '20px' }}>
      <Typography variant="h6">{t('presentPage.texts.header')}</Typography>
      <Typography variant="body2" sx={{ marginBottom: '20px' }}>{t('presentPage.texts.subHeader')}</Typography>
      <Dropzone onDrop={onDrop} file={presenterFile} onReset={() => { setPresenterFile(undefined); setHeaders([]); }} />
      {presenterFile && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={handleGoLive} sx={{ mr: 2 }} disabled={!sharedWorker.current}>{isLive ? t('presentPage.buttons.stopLive') : t('presentPage.buttons.goLive')}</Button>
          <Button variant="outlined" onClick={handleFirst}>{t('presentPage.buttons.first')}</Button>
          <Button variant="outlined" onClick={handlePrevious} disabled={!loop && currentPage === 1}>{t('presentPage.buttons.previous')}</Button>
          <Button variant="outlined" onClick={handleNext} disabled={!loop && currentPage === totalPages}>{t('presentPage.buttons.next')}</Button>
          <Button variant="outlined" onClick={() => setLoop(!loop)}>{loop ? t('presentPage.buttons.stopLoop') : t('presentPage.buttons.loop')}</Button>
          <Button variant="contained" onClick={() => setIsAutoplaying(!isAutoplaying)}>{isAutoplaying ? t('presentPage.buttons.stopAutoplay') : t('presentPage.buttons.startAutoplay')}</Button>
          <TextField
            label={t('presentPage.fields.interval')}
            type="number"
            value={autoplayInterval}
            onChange={(e) => setAutoplayInterval(parseInt(e.target.value, 10))}
            sx={{ width: 150 }}
          />
          <Typography>{currentPage}/{totalPages}</Typography>
          <TextField label={t('presentPage.fields.shownPlayers')} type="number" value={shownPlayers} onChange={(e) => setShownPlayers(parseInt(e.target.value, 10))} sx={{ width: 150 }} />
              <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>{t('presentPage.fields.orderBy')}</InputLabel>
                  <Select value={orderBy} label={t('presentPage.fields.orderBy')} onChange={(e) => setOrderBy(e.target.value)}>
                      {headers.map((header) => (
                          <MenuItem key={header} value={header}>{header}</MenuItem>
                      ))}
                  </Select>
              </FormControl>
          <Button variant="contained" onClick={handleOpenDisplay} sx={{ mr: 2 }} disabled={presenterData.length === 0}>{t('presentPage.buttons.openDisplay')}</Button>
        </Box>
      )}
      
      {presenterFile && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6">{t('presentPage.texts.customTheme')}</Typography>
          <TextField
            label={t('presentPage.fields.customThemeJson')}
            multiline
            rows={10}
            fullWidth
            value={customThemeJson}
            onChange={(e) => setCustomThemeJson(e.target.value)}
            sx={{ mt: 2 }}
          />
          <Button variant="contained" onClick={handleSaveCustomTheme} sx={{ mt: 2 }}>
            {t('presentPage.buttons.saveCustomTheme')}
          </Button>
          <Button variant="outlined" onClick={handleResetCustomTheme} sx={{ mt: 2, ml: 2 }}>
            {t('presentPage.buttons.resetToDefaultTheme')}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PresentPage;