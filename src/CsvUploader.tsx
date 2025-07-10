import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography } from '@mui/material';
import Papa from 'papaparse';
import { useStore } from './store';
import { useTranslation } from 'react-i18next';

const CsvUploader: React.FC = () => {
  const { setFile, setHeaders, setUniqueValues } = useStore();
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

  return (
    <Box sx={{ marginTop: '20px' }}>
      <Typography variant="h6">{t('csvUploader.texts.header')}</Typography>
      <Typography variant="body2" sx={{ marginBottom: '20px' }}>{t('csvUploader.texts.subHeader')}</Typography>
      <Box
        {...getRootProps()}
        sx={{
          border: '3px dashed grey',
          padding: '40px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive ? '#e0e0e0' : 'transparent',
          width: '100%',
        }}
      >
        <input {...getInputProps()} />
        {
          isDragActive ?
            <Typography>{t('csvUploader.texts.dragAndDrop')}</Typography> :
            <Typography>{t('csvUploader.texts.dragAndDrop')}</Typography>
        }
      </Box>
    </Box>
  );
};

export default CsvUploader;