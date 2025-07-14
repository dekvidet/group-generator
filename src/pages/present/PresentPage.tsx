import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import Papa from 'papaparse';
import { useStore } from '../../store';
import { useTranslation } from 'react-i18next';
import Dropzone from '../../components/Dropzone';

const PresentPage: React.FC = () => {
  const { file, setFile, headers, setHeaders, generatedGroups, setGeneratedGroups } = useStore();
  const { t } = useTranslation();
  const [isLive, setIsLive] = useState(false);
  const [loop, setLoop] = useState(false);
  const [shownPlayers, setShownPlayers] = useState(5);
  const [orderBy, setOrderBy] = useState('');
  const sharedWorker = useRef<SharedWorker | null>(null);

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
    setFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        const headers = results.meta.fields || [];
        setHeaders(headers);
        // Assuming the CSV is already processed and contains group information
        // For demonstration, we'll just set the parsed data as generated groups
        setGeneratedGroups([ { id: 1, participants: results.data } ]);
      },
    });
  };

  const handleGoLive = () => {
    setIsLive(!isLive);
  };

  const handleFirst = () => {
    // Logic for first
  };

  const handlePrevious = () => {
    // Logic for previous
  };

  const handleNext = () => {
    // Logic for next
  };

  const handleOpenDisplay = () => {
    window.open('/display', '_blank');
  };

  return (
    <Box sx={{ marginTop: '20px' }}>
      <Typography variant="h6">{t('presentPage.texts.header')}</Typography>
      <Typography variant="body2" sx={{ marginBottom: '20px' }}>{t('presentPage.texts.subHeader')}</Typography>
      <Dropzone onDrop={onDrop} file={file} onReset={() => { setFile(null); setHeaders([]); }} />
      {file && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={handleGoLive} sx={{ mr: 2 }} disabled={!sharedWorker.current}>{isLive ? 'Stop Live' : 'Go Live'}</Button>
          <Button variant="outlined" onClick={handleFirst}>First</Button>
          <Button variant="outlined" onClick={handlePrevious}>Previous</Button>
          <Button variant="outlined" onClick={handleNext}>Next</Button>
          <Button variant="outlined" onClick={() => setLoop(!loop)}>{loop ? 'Stop Loop' : 'Loop'}</Button>
          <TextField label="Shown players" type="number" value={shownPlayers} onChange={(e) => setShownPlayers(parseInt(e.target.value, 10))} sx={{ width: 150 }} />
              <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Order By</InputLabel>
                  <Select value={orderBy} label="Order By" onChange={(e) => setOrderBy(e.target.value)}>
                      {headers.map((header) => (
                          <MenuItem key={header} value={header}>{header}</MenuItem>
                      ))}
                  </Select>
              </FormControl>
          <Button variant="contained" onClick={handleOpenDisplay} sx={{ mr: 2 }} disabled={generatedGroups.length === 0}>Open Display</Button>
        </Box>
      )}
    </Box>
  );
};

export default PresentPage;