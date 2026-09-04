import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Queue from './Queue';
import Detail from './Detail';

const ApplicationReview = () => {
  // Supports deep-linking from the "new application" admin email
  // (?id=123 opens that application directly instead of the queue).
  const location = useLocation();
  const initialId = new URLSearchParams(location.search).get('id');
  const [selectedId, setSelectedId] = useState(initialId ? Number(initialId) : null);

  return selectedId ? (
    <Detail id={selectedId} onBack={() => setSelectedId(null)} />
  ) : (
    <Queue onSelect={setSelectedId} />
  );
};

export default ApplicationReview;
