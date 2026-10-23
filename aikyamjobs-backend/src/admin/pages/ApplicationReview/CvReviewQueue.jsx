import React, { useCallback, useEffect, useState } from 'react';
import {
  Main,
  Box,
  Flex,
  Typography,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Button,
  Badge,
  Tabs,
  EmptyStateLayout,
} from '@strapi/design-system';

import { Page, Layouts, useFetchClient, useNotification } from '@strapi/strapi/admin';

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
  const { toggleNotification } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(TABS[0].key);
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
    fetchQueue(activeTab, page);
  }, [activeTab, page, fetchQueue]);

  // See Queue.js's identical handler for why the reset lives here rather
  // than in a separate effect keyed on activeTab (avoids a double-fetch race).
  const handleTabChange = (value) => {
    setActiveTab(value);
    setPage(1);
  };

  return (
    <Main>
      <Layouts.Header
        title="CV Improver"
        subtitle="General CV feedback requests, not tied to any specific job — read the CV, note what's working and what to fix."
      />
      <Layouts.Action
        startActions={
          <Tabs.Root value={activeTab} onValueChange={handleTabChange} variant="simple">
            <Tabs.List aria-label="Filter by status">
              {TABS.map((t) => (
                <Tabs.Trigger key={t.key} value={t.key}>{t.label}</Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs.Root>
        }
      />
      <Layouts.Content>
        {isLoading ? (
          <Page.Loading />
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
      </Layouts.Content>
    </Main>
  );
};

const VisuallyHiddenLabel = () => (
  <Box>
    <Typography variant="sigma">Actions</Typography>
  </Box>
);

export default CvReviewQueue;
