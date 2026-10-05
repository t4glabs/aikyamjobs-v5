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
  { key: 'approved', label: 'Approved' },
  { key: 'rejected_with_tips', label: 'Not a match' },
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

const Queue = ({ onSelect }) => {
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
          `/admin/application-review/queue?status=${status}&page=${p}&pageSize=${PAGE_SIZE}`
        );
        setQueue(data.queue);
        setPageCount(data.pagination?.pageCount || 1);
        setTotal(data.pagination?.total || data.queue.length);
      } catch (error) {
        toggleNotification({ type: 'warning', message: 'Could not load applications.' });
      } finally {
        setIsLoading(false);
      }
    },
    [get, toggleNotification]
  );

  useEffect(() => {
    fetchQueue(TABS[tabIndex].key, page);
  }, [tabIndex, page, fetchQueue]);

  // Tab change always resets to page 1 in the SAME state update as the tab
  // switch itself (not a separate effect reacting to tabIndex) -- otherwise
  // two fetches fire back-to-back (one for the new tab at the old page, one
  // for the reset to page 1), and whichever response lands second wins,
  // which isn't guaranteed to be the page-1 one.
  const handleTabChange = (index) => {
    setTabIndex(index);
    setPage(1);
  };

  return (
    <Main>
      <HeaderLayout
        title="Application Review"
        subtitle="Score a CV against a job's requirements, leave notes, and decide — good match or not, either way the applicant hears back."
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
          <Table colCount={7} rowCount={queue.length}>
            <Thead>
              <Tr>
                <Th><Typography variant="sigma">Applicant</Typography></Th>
                <Th><Typography variant="sigma">Job</Typography></Th>
                <Th><Typography variant="sigma">Self-score</Typography></Th>
                <Th><Typography variant="sigma">Flags</Typography></Th>
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
                    <Typography>{item.jobTitle}</Typography>
                    {item.companyName && (
                      <Typography variant="pi" textColor="neutral600">{item.companyName}</Typography>
                    )}
                  </Td>
                  <Td><Typography>{item.checklistPercent}%</Typography></Td>
                  <Td>
                    {item.hasRequiredMissing && (
                      <Badge backgroundColor="warning100" textColor="warning700">
                        Missing essentials
                      </Badge>
                    )}
                  </Td>
                  <Td><Typography>{formatDate(item.submittedAt)}</Typography></Td>
                  <Td>
                    <Badge
                      backgroundColor={
                        item.status === 'approved'
                          ? 'success100'
                          : item.status === 'rejected_with_tips'
                            ? 'neutral150'
                            : 'primary100'
                      }
                      textColor={
                        item.status === 'approved'
                          ? 'success700'
                          : item.status === 'rejected_with_tips'
                            ? 'neutral700'
                            : 'primary700'
                      }
                    >
                      {item.status}
                    </Badge>
                  </Td>
                  <Td>
                    <Button variant="tertiary" onClick={() => onSelect(item.id)}>
                      {item.decisionAt ? 'View / edit' : 'Review'}
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

export default Queue;
