import React, { useState, useEffect, useRef } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, ThemeProvider, createTheme } from '@mui/material';
import darkTheme from '../../theme';


interface DisplayData {
  headers: string[];
  rows: any[];
}

const DisplayPage: React.FC = () => {
  const [displayData, setDisplayData] = useState<DisplayData | null>(null);
  const [customTheme, setCustomTheme] = useState<any>(darkTheme);
  const sharedWorker = useRef<SharedWorker | null>(null);

  useEffect(() => {
    sharedWorker.current = new SharedWorker(new URL('../sharedWorker.js', import.meta.url), {
      name: 'team-generator-worker',
    });

    sharedWorker.current.port.onmessage = (event) => {
      if (event.data.type === 'customTheme') {
        try {
          setCustomTheme(createTheme(event.data.theme));
        } catch (error) {
          console.error("Error applying custom theme:", error);
        }
      } else {
        setDisplayData(event.data);
      }
    };

    return () => {
      sharedWorker.current?.port.close();
    };
  }, []);

  if (!displayData) {
    return ;
  }

  return (
    <ThemeProvider theme={customTheme || createTheme()}>
      <Box sx={{ padding: '20px' }}>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead sx={{ backgroundColor: '#333333' }}>
              <TableRow>
                {displayData.headers.map((header) => (
                  <TableCell key={header}><b>{header}</b></TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayData.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex} sx={{ backgroundColor: rowIndex % 2 === 0 ? '#222222' : '#2c2c2c' }}>
                  {displayData.headers.map((header) => (
                    <TableCell key={`${rowIndex}-${header}`}>{row[header]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </ThemeProvider>
  );
};

export default DisplayPage;
