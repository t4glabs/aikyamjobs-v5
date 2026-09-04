import React, { useCallback, useEffect, useState } from 'react';
import {
  useFetchClient,
  useNotification,
  LoadingIndicatorPage,
} from '@strapi/helper-plugin';
import { Main } from '@strapi/design-system/Main';
import { HeaderLayout, ContentLayout, ActionLayout } from '@strapi/design-system/Layout';
import { Box } from '@strapi/design-system/Box';
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

const Queue = ({ onSelect }) => {
  const { get } = useFetchClient();
  const toggleNotification = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [queue, setQueue] = useState([]);

  const fetchQueue = useCallback(
    async (status) => {
      setIsLoading(true);
      try {
        const { data } = await get(`/admin/application-review/queue?status=${status}`);
        setQueue(data.queue);
      } catch (error) {
        toggleNotification({ type: 'warning', message: 'Could not load applications.' });
      } finally {
        setIsLoading(false);
      }
    },
    [get, toggleNotification]
  );

  useEffect(() => {
    fetchQueue(TABS[tabIndex].key);
  }, [tabIndex, fetchQueue]);

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
            onTabChange={(index) => setTabIndex(index)}
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
                    <Typography fontWeight="semiBold">{item.applicantName || '—'}</Typography>
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
