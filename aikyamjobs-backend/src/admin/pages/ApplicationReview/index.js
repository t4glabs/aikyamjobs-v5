import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Button } from '@strapi/design-system/Button';
import Queue from './Queue';
import Detail from './Detail';
import CvReviewQueue from './CvReviewQueue';
import CvReviewDetail from './CvReviewDetail';

const SECTIONS = [
  { key: 'applications', label: 'Applications' },
  { key: 'cv-reviews', label: 'CV Improver' },
];

// Pulls the real bundled CVs via an authenticated request (a plain <a href>
// can't carry the admin JWT), then hands the browser a real file to save --
// same candidate scope as the existing /cv-export JSON listing (applicants
// who've actually applied or used CV Improver, never a bare abandoned
// upload), just as one .zip of the actual files instead of a list of links.
function DownloadCvsButton() {
  const { get } = useFetchClient();
  const toggleNotification = useNotification();
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const response = await get('/admin/application-review/cv-export/zip', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aikyamjobs-cvs-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toggleNotification({ type: 'warning', message: 'Could not download CVs.' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button variant="secondary" onClick={download} loading={downloading}>
      Download CVs
    </Button>
  );
}

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
        <Box paddingLeft={8} paddingRight={8} paddingTop={6} paddingBottom={2}>
          <Flex justifyContent="space-between" alignItems="center">
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
            <DownloadCvsButton />
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
