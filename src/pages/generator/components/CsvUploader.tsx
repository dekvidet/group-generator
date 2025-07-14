import React from 'react';
import { Box, Typography } from '@mui/material';
import Papa from 'papaparse';
import { useStore } from '../../../store';
import { useTranslation } from 'react-i18next';
import Dropzone from '../../../components/Dropzone';

const CsvUploader: React.FC = () => {
  const { generatorFile, setGeneratorFile, setHeaders, setUniqueValues, reset } = useStore();
  const { t } = useTranslation();

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setGeneratorFile(file);

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

  return (
    <Box sx={{ marginTop: '20px' }}>
      <Typography variant="h6">{t('csvUploader.texts.header')}</Typography>
      <Typography variant="body2" sx={{ marginBottom: '20px' }}>{t('csvUploader.texts.subHeader')}</Typography>
      <Dropzone onDrop={onDrop} file={generatorFile || undefined} onReset={reset} />
    </Box>
  );
};

export default CsvUploader;