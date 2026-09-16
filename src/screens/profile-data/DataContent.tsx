import { ScrollView } from 'react-native';

import type { ApiClientData } from '@/api/types';
import { hasFeature } from '@/lib/features';

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
      {/* Apple Health, Garmin, Whoop and Strava — none of which has an SDK
          installed or OAuth configured. Gated with the feature it belongs to
          rather than left offering four apps nothing can talk to. */}
      {hasFeature('integrations') ? <DataImportCard sources={data.importSources} /> : null}
      <DataAccessCard access={data.access} />
      <DataDangerCard />
    </ScrollView>
  );
}
