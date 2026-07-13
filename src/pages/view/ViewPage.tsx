import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material';
import Papa from 'papaparse';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import LanguageSelector from '../../components/LanguageSelector';

type CsvRow = Record<string, string>;
type SortDirection = 'asc' | 'desc';

function parseCsv(csv: string): { headers: string[]; rows: CsvRow[] } {
  const result = Papa.parse<CsvRow>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: header => header.trim(),
  });

  if (result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }

  const headers = (result.meta.fields ?? []).filter(Boolean);
  if (headers.length === 0) {
    throw new Error('The CSV does not contain a header row.');
  }

  return {
    headers,
    rows: result.data.map(row => Object.fromEntries(
      headers.map(header => [header, String(row[header] ?? '')]),
    )),
  };
}

const ViewPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileUrl = searchParams.get('file')?.trim() ?? '';
  const [address, setAddress] = useState(fileUrl);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCsvText = useCallback((csv: string) => {
    const parsed = parseCsv(csv);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setSortColumn(parsed.headers[0] ?? '');
    setError(null);
  }, []);

  useEffect(() => {
    if (!fileUrl) return;

    const controller = new AbortController();
    setAddress(fileUrl);
    setLoading(true);
    setError(null);

    fetch(fileUrl, { signal: controller.signal })
      .then(response => {
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
        return response.text();
      })
      .then(loadCsvText)
      .catch(fetchError => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        setHeaders([]);
        setRows([]);
        setError(t('viewPage.errors.loadFailed', { message: fetchError instanceof Error ? fetchError.message : String(fetchError) }));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [fileUrl, loadCsvText, t]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    file.text()
      .then(loadCsvText)
      .catch(readError => setError(t('viewPage.errors.loadFailed', { message: readError instanceof Error ? readError.message : String(readError) })))
      .finally(() => setLoading(false));
  }, [loadCsvText, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'text/csv': ['.csv'] },
  });

  const visibleRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(i18n.language);
    const filtered = query
      ? rows.filter(row => headers.some(header => row[header].toLocaleLowerCase(i18n.language).includes(query)))
      : [...rows];

    if (!sortColumn) return filtered;
    return filtered.sort((first, second) => {
      const comparison = first[sortColumn].localeCompare(second[sortColumn], i18n.language, {
        numeric: true,
        sensitivity: 'base',
      });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [headers, i18n.language, rows, search, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(previous => previous === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleAddressSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const url = new URL(address);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      setSearchParams({ file: url.toString() });
    } catch {
      setError(t('viewPage.errors.invalidAddress'));
    }
  };

  const hasData = headers.length > 0;

  return (
    <Container maxWidth={hasData ? 'xl' : 'md'} sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <LanguageSelector compact />
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && !hasData && (
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>{t('viewPage.title')}</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>{t('viewPage.description')}</Typography>
          <Box component="form" onSubmit={handleAddressSubmit} sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              fullWidth
              label={t('viewPage.csvAddress')}
              value={address}
              onChange={event => setAddress(event.target.value)}
              placeholder="https://group-generator.keresztech.org/results/…csv"
            />
            <Button type="submit" variant="contained" disabled={!address.trim()}>{t('viewPage.load')}</Button>
          </Box>
          <Paper
            {...getRootProps()}
            variant="outlined"
            sx={{ borderStyle: 'dashed', borderWidth: 2, p: 6, textAlign: 'center', cursor: 'pointer', bgcolor: isDragActive ? 'action.hover' : 'transparent' }}
          >
            <input {...getInputProps()} />
            <Typography>{t('viewPage.dropCsv')}</Typography>
          </Paper>
        </Box>
      )}

      {!loading && hasData && (
        <>
          <TextField
            fullWidth
            size="small"
            label={t('viewPage.search')}
            value={search}
            onChange={event => setSearch(event.target.value)}
            sx={{ mb: 2 }}
          />
          <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 130px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {headers.map(header => (
                    <TableCell key={header} sortDirection={sortColumn === header ? sortDirection : false}>
                      <TableSortLabel
                        active={sortColumn === header}
                        direction={sortColumn === header ? sortDirection : 'asc'}
                        onClick={() => handleSort(header)}
                      >
                        {header}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.map((row, rowIndex) => (
                  <TableRow hover key={rowIndex}>
                    {headers.map(header => <TableCell key={header}>{row[header]}</TableCell>)}
                  </TableRow>
                ))}
                {visibleRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={headers.length} align="center">{t('viewPage.noResults')}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Container>
  );
};

export default ViewPage;
