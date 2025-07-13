import React from 'react';
import CsvUploader from './components/CsvUploader';
import ColumnMapper from './components/ColumnMapper';
import StatisticsTables from './components/StatisticsTables';
import GroupGenerator from './components/GroupGenerator';
import GroupResults from './components/GroupResults';

const GeneratorPage: React.FC = () => {
  return (
    <>
      <CsvUploader />
      <ColumnMapper />
      <StatisticsTables />
      <GroupGenerator />
      <GroupResults />
    </>
  );
};

export default GeneratorPage;