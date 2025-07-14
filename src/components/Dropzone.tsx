import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Button, Paper } from '@mui/material';

import { useTranslation } from 'react-i18next';

interface DropzoneProps {
  onDrop: (acceptedFiles: File[]) => void;
  file: File | undefined;
  onReset: () => void;
}

const Dropzone: React.FC<DropzoneProps> = ({ onDrop, file, onReset }) => {
  const { t } = useTranslation();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] } });

  const handleReset = () => {
    onReset();
  };

  if (file) {
    return (
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
    );
  }

  return (
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
  );
};

export default Dropzone;