import React from 'react';
import { HistoryModal } from '../components/common/HistoryModal';
import { HistoryItem } from '../types';

export interface HistoryPageProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelectVideo: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = (props) => {
  return <HistoryModal {...props} />;
};

export default HistoryPage;
