import React, { useCallback, useEffect, useState } from 'react';
import {
  useFetchClient,
  useNotification,
  LoadingIndicatorPage,
} from '@strapi/helper-plugin';
import { Main } from '@strapi/design-system/Main';
import { HeaderLayout, ContentLayout, ActionLayout } from '@strapi/design-system/Layout';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { Table, Thead, Tbody, Tr, Td, Th } from '@strapi/design-system/Table';
import { Button } from '@strapi/design-system/Button';
import { Badge } from '@strapi/design-system/Badge';
import { Tabs, Tab, TabGroup } from '@strapi/design-system/Tabs';
import { EmptyStateLayout } from '@strapi/design-system/EmptyStateLayout';

const TABS = [
  { key: 'pending', label: 'Needs review' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'all', label: 'All' },
];

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const PAGE_SIZE = 20;

const CvReviewQueue = ({ onSelect }) => {
  const { get } = useFetchClient();
  const toggleNotification = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [queue, setQueue] = useState([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchQueue = useCallback(
    async (status, p) => {
      setIsLoading(true);
      try {
        const { data } = await get(
          `/admin/application-review/cv-reviews?status=${status}&page=${p}&pageSize=${PAGE_SIZE}`
        );
        setQueue(data.queue);
        setPageCount(data.pagination?.pageCount || 1);
        setTotal(data.pagination?.total || data.queue.length);
      } catch (error) {
        toggleNotification({ type: 'warning', message: 'Could not load CV Improver requests.' });
      } finally {
        setIsLoading(false);
      }
    },
    [get, toggleNotification]
  );

  useEffect(() => {
    fetchQueue(TABS[tabIndex].key, page);
  }, [tabIndex, page, fetchQueue]);

  // See Queue.js's identical handler for why the reset lives here rather
  // than in a separate effect keyed on tabIndex (avoids a double-fetch race).
  const handleTabChange = (index) => {
    setTabIndex(index);
    setPage(1);
  };

  return (
    <Main>
      <HeaderLayout
        title="CV Improver"
        subtitle="General CV feedback requests, not tied to any specific job — read the CV, note what's working and what to fix."
      />
      <ActionLayout
        startActions={
          <TabGroup
            label="Filter by status"
            variant="simple"
            onTabChange={handleTabChange}
          >
            <Tabs>
              {TABS.map((t) => (
                <Tab key={t.key}>{t.label}</Tab>
              ))}
            </Tabs>
          </TabGroup>
        }
      />
      <ContentLayout>
        {isLoading ? (
          <LoadingIndicatorPage />
        ) : queue.length === 0 ? (
          <EmptyStateLayout content="Nothing here right now." />
        ) : (
          <Table colCount={6} rowCount={queue.length}>
            <Thead>
              <Tr>
                <Th><Typography variant="sigma">Applicant</Typography></Th>
                <Th><Typography variant="sigma">Targeting</Typography></Th>
                <Th><Typography variant="sigma">CV Mindmap</Typography></Th>
                <Th><Typography variant="sigma">Submitted</Typography></Th>
                <Th><Typography variant="sigma">Status</Typography></Th>
                <Th><VisuallyHiddenLabel /></Th>
              </Tr>
            </Thead>
            <Tbody>
              {queue.map((item) => (
                <Tr key={item.id}>
                  <Td>
                    <Typography fontWeight="semiBold">
                      {item.isStarCandidate ? '⭐ ' : ''}
                      {item.applicantName || '—'}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600">{item.applicantEmail}</Typography>
                  </Td>
                  <Td>
                    <Typography>{item.targetRoles}</Typography>
                  </Td>
                  <Td>
                    <Badge
                      backgroundColor={item.hasCvMindmap ? 'success100' : 'neutral150'}
                      textColor={item.hasCvMindmap ? 'success700' : 'neutral600'}
                    >
                      {item.hasCvMindmap ? 'Added' : 'Missing'}
                    </Badge>
                  </Td>
                  <Td><Typography>{formatDate(item.submittedAt)}</Typography></Td>
                  <Td>
                    <Badge
                      backgroundColor={item.status === 'reviewed' ? 'success100' : 'primary100'}
                      textColor={item.status === 'reviewed' ? 'success700' : 'primary700'}
                    >
                      {item.status}
                    </Badge>
                  </Td>
                  <Td>
                    <Button variant="tertiary" onClick={() => onSelect(item.id)}>
                      {item.reviewedAt ? 'View / edit' : 'Review'}
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
        {pageCount > 1 && (
          <Box paddingTop={4}>
            <Flex justifyContent="space-between" alignItems="center">
              <Typography variant="pi" textColor="neutral600">
                Page {page} of {pageCount} — {total} total
              </Typography>
              <Flex gap={2}>
                <Button
                  variant="tertiary"
                  size="S"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ‹ Previous
                </Button>
                <Button
                  variant="tertiary"
                  size="S"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next ›
                </Button>
              </Flex>
            </Flex>
          </Box>
        )}
      </ContentLayout>
    </Main>
  );
};

const VisuallyHiddenLabel = () => (
  <Box>
    <Typography variant="sigma">Actions</Typography>
  </Box>
);

export default CvReviewQueue;
