import { ScrollView } from 'react-native';

import type { ApiClientData } from '@/api/types';

import DataAccessCard from './DataAccessCard';
import DataDangerCard from './DataDangerCard';
import DataExportCard from './DataExportCard';
import DataHeroCard from './DataHeroCard';
import DataImportCard from './DataImportCard';

interface DataContentProps {
  readonly data: ApiClientData;
}

export default function DataContent({ data }: DataContentProps) {
  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 px-4 pb-8 pt-2">
      <DataHeroCard counts={data.counts} />
      <DataExportCard lastExport={data.lastExport} />
      <DataImportCard sources={data.importSources} />
      <DataAccessCard access={data.access} />
      <DataDangerCard />
    </ScrollView>
  );
}
