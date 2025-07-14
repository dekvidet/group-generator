import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import Papa from 'papaparse';
import { useStore } from '../../store';
import { useTranslation } from 'react-i18next';
import Dropzone from '../../components/Dropzone';

const PresentPage: React.FC = () => {
  const { presenterFile, setPresenterFile, headers, setHeaders } = useStore();
  const { t } = useTranslation();
  const [isLive, setIsLive] = useState(false);
  const [loop, setLoop] = useState(false);
  const [shownPlayers, setShownPlayers] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [orderBy, setOrderBy] = useState('');
  const [presenterData, setPresenterData] = useState<any[]>([]);
  const sharedWorker = useRef<SharedWorker | null>(null);

  const totalRows = presenterData.length || 0;
  const totalPages = Math.ceil(totalRows / shownPlayers);

  useEffect(() => {
    setCurrentPage(1);
  }, [presenterFile, shownPlayers]);

  useEffect(() => {
    if (sharedWorker.current) {
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
  }, [presenterData, currentPage, shownPlayers, headers, orderBy]);

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
    setIsLive(!isLive);
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

  const handleNext = () => {
    const totalRows = presenterData.length || 0;
    const totalPages = Math.ceil(totalRows / shownPlayers);
    setCurrentPage((prevPage) => {
      if (loop) {
        return (prevPage % totalPages) + 1;
      } else {
        return Math.min(prevPage + 1, totalPages);
      }
    });
  };

  const handleOpenDisplay = () => {
    window.open('/display', '_blank');
  };

  return (
    <Box sx={{ marginTop: '20px' }}>
      <Typography variant="h6">{t('presentPage.texts.header')}</Typography>
      <Typography variant="body2" sx={{ marginBottom: '20px' }}>{t('presentPage.texts.subHeader')}</Typography>
      <Dropzone onDrop={onDrop} file={presenterFile} onReset={() => { setPresenterFile(null); setHeaders([]); }} />
      {presenterFile && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={handleGoLive} sx={{ mr: 2 }} disabled={!sharedWorker.current}>{isLive ? 'Stop Live' : 'Go Live'}</Button>
          <Button variant="outlined" onClick={handleFirst}>First</Button>
          <Button variant="outlined" onClick={handlePrevious} disabled={!loop && currentPage === 1}>Previous</Button>
          <Button variant="outlined" onClick={handleNext} disabled={!loop && currentPage === totalPages}>Next</Button>
          <Button variant="outlined" onClick={() => setLoop(!loop)}>{loop ? 'Stop Loop' : 'Loop'}</Button>
          <Typography>{currentPage}/{totalPages}</Typography>
          <TextField label="Shown players" type="number" value={shownPlayers} onChange={(e) => setShownPlayers(parseInt(e.target.value, 10))} sx={{ width: 150 }} />
              <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Order By</InputLabel>
                  <Select value={orderBy} label="Order By" onChange={(e) => setOrderBy(e.target.value)}>
                      {headers.map((header) => (
                          <MenuItem key={header} value={header}>{header}</MenuItem>
                      ))}
                  </Select>
              </FormControl>
          <Button variant="contained" onClick={handleOpenDisplay} sx={{ mr: 2 }} disabled={presenterData.length === 0}>Open Display</Button>
        </Box>
      )}
    </Box>
  );
};

export default PresentPage;