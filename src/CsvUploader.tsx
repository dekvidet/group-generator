import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Button, Paper } from '@mui/material';
import Papa from 'papaparse';
import { useStore } from './store';
import { useTranslation } from 'react-i18next';

const CsvUploader: React.FC = () => {
  const { file, setFile, setHeaders, setUniqueValues, reset } = useStore();
  const { t } = useTranslation();

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        const headers = results.meta.fields || [];
        setHeaders(headers);

        const uniqueValues: Record<string, string[]> = {};
        headers.forEach((header: string) => {
          const values = new Set<string>();
          results.data.forEach((row: any) => {
            if (row[header]) {
              values.add(row[header]);
            }
          });
          uniqueValues[header] = Array.from(values);
        });
        setUniqueValues(uniqueValues);
      },
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleReset = () => {
    reset();
  };

  return (
    <Box sx={{ marginTop: '20px' }}>
      <Typography variant="h6">{t('csvUploader.texts.header')}</Typography>
      <Typography variant="body2" sx={{ marginBottom: '20px' }}>{t('csvUploader.texts.subHeader')}</Typography>
      {file ? (
        <Paper
          elevation={3}
          sx={{
            padding: '20px',
            textAlign: 'center',
            width: '100%',
            opacity: 1,
            transition: 'opacity 0.5s ease-in-out',
          }}
        >
          <Typography variant="h6">{file.name}</Typography>
          <Button variant="contained" color="primary" onClick={handleReset} sx={{ marginTop: '10px' }}>
            {t('csvUploader.buttons.reset')}
          </Button>
        </Paper>
      ) : (
        <Box
          {...getRootProps()}
          sx={{
            border: '3px dashed grey',
            padding: '40px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragActive ? '#e0e0e0' : 'transparent',
            width: '100%',
            opacity: 1,
            transition: 'opacity 0.5s ease-in-out',
          }}
        >
          <input {...getInputProps()} />
          <Typography>{t('csvUploader.texts.dragAndDrop')}</Typography>
        </Box>
      )}
    </Box>
  );
};

export default CsvUploader;