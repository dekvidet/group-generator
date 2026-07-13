import type { SelectChangeEvent } from '@mui/material';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import i18n from '../i18n';

interface LanguageSelectorProps {
  compact?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ compact = false }) => (
  <FormControl sx={{ minWidth: 120 }} size={compact ? 'small' : 'medium'}>
    <InputLabel id="language-select-label">Language</InputLabel>
    <Select
      labelId="language-select-label"
      value={i18n.language.substring(0, 2)}
      label="Language"
      onChange={(event: SelectChangeEvent) => i18n.changeLanguage(event.target.value)}
    >
      <MenuItem value="en">English</MenuItem>
      <MenuItem value="hu">Hungarian</MenuItem>
    </Select>
  </FormControl>
);

export default LanguageSelector;
