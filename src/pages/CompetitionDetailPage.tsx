import React from 'react';
import { Navigate } from 'react-router-dom';

export const CompetitionDetailPage: React.FC = () => {
  return <Navigate to="/competitions" replace />;
};
