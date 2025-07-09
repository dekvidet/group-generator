import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography } from '@mui/material';
import Papa from 'papaparse';
import { useStore } from './store';

const CsvUploader: React.FC = () => {
  const { setFile, setHeaders, setUniqueValues } = useStore();

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setFile(file);

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        setHeaders(headers);

        const uniqueValues: Record<string, string[]> = {};
        headers.forEach(header => {
          const values = new Set<string>();
          (results.data as any[]).forEach(row => {
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
          <Typography>Drop the files here ...</Typography> :
          <Typography>Drag 'n' drop a CSV file here, or click to select a file</Typography>
      }
    </Box>
  );
};

export default CsvUploader;