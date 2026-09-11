import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import Queue from './Queue';
import Detail from './Detail';
import CvReviewQueue from './CvReviewQueue';
import CvReviewDetail from './CvReviewDetail';

const SECTIONS = [
  { key: 'applications', label: 'Applications' },
  { key: 'cv-reviews', label: 'CV Improver' },
];

const ApplicationReview = () => {
  // Supports deep-linking from admin notification emails: ?id=123 opens that
  // record directly, and ?tab=cv-reviews picks which queue it belongs to.
  // Plain buttons here instead of Strapi's Tabs/TabGroup — that component
  // manages its own internal active index and doesn't take an externally
  // controlled initial value, so a deep-link into "cv-reviews" would show the
  // right content but leave the tab bar visually stuck on "Applications".
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialSection = params.get('tab') === 'cv-reviews' ? 'cv-reviews' : 'applications';
  const initialId = params.get('id');

  const [section, setSection] = useState(initialSection);
  const [selectedId, setSelectedId] = useState(initialId ? Number(initialId) : null);

  const back = () => setSelectedId(null);

  return (
    <Box>
      {selectedId === null && (
        <Box paddingLeft={8} paddingTop={6} paddingBottom={2}>
          <Flex gap={2}>
            {SECTIONS.map((s) => {
              const active = s.key === section;
              return (
                <Box
                  key={s.key}
                  as="button"
                  type="button"
                  onClick={() => {
                    setSection(s.key);
                    setSelectedId(null);
                  }}
                  padding={2}
                  paddingLeft={4}
                  paddingRight={4}
                  hasRadius
                  background={active ? 'primary100' : 'transparent'}
                  color={active ? 'primary600' : 'neutral600'}
                  style={{
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {s.label}
                </Box>
              );
            })}
          </Flex>
        </Box>
      )}

      {section === 'applications' ? (
        selectedId ? (
          <Detail id={selectedId} onBack={back} />
        ) : (
          <Queue onSelect={setSelectedId} />
        )
      ) : selectedId ? (
        <CvReviewDetail id={selectedId} onBack={back} />
      ) : (
        <CvReviewQueue onSelect={setSelectedId} />
      )}
    </Box>
  );
};

export default ApplicationReview;
