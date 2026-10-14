import React from 'react';
import { SummaryTab } from '../components/summary/SummaryTab';
import { SummaryData } from '../types';

export interface StudyNotesPageProps {
  summary: SummaryData;
  onSeek: (seconds: number) => void;
  onCopyNotes: () => void;
  onDownloadMarkdown: () => void;
  onDownloadText: () => void;
}

export const StudyNotesPage: React.FC<StudyNotesPageProps> = (props) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <SummaryTab {...props} />
    </div>
  );
};

export default StudyNotesPage;
