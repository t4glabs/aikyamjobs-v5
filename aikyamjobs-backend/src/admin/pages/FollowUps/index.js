import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useFetchClient,
  useNotification,
  LoadingIndicatorPage,
} from '@strapi/helper-plugin';
import { Main } from '@strapi/design-system/Main';
import { HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Table, Thead, Tbody, Tr, Td, Th } from '@strapi/design-system/Table';
import { Button } from '@strapi/design-system/Button';
import { Badge } from '@strapi/design-system/Badge';
import { EmptyStateLayout } from '@strapi/design-system/EmptyStateLayout';

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const FollowUps = () => {
  const { get, post } = useFetchClient();
  const toggleNotification = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [thresholdDays, setThresholdDays] = useState(null);
  const [queue, setQueue] = useState([]);
  const [markingId, setMarkingId] = useState(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await get('/admin/follow-ups/queue');
      setThresholdDays(data.thresholdDays);
      setQueue(data.queue);
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: 'Could not load the follow-up queue.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [get, toggleNotification]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleMarkFollowedUp = async (id) => {
    setMarkingId(id);
    try {
      await post(`/admin/follow-ups/queue/${id}/mark-followed-up`);
      setQueue((current) => current.filter((job) => job.id !== id));
      toggleNotification({
        type: 'success',
        message: "Marked as followed up — it'll resurface after the next threshold period.",
      });
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: 'Could not mark this job as followed up.',
      });
    } finally {
      setMarkingId(null);
    }
  };

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Main>
      <HeaderLayout
        title="Follow-ups"
        subtitle={
          thresholdDays !== null
            ? `Draft jobs unpublished (or last checked in on) more than ${thresholdDays} day${
                thresholdDays === 1 ? '' : 's'
              } ago — configurable in Site Settings.`
            : undefined
        }
      />
      <ContentLayout>
        {queue.length === 0 ? (
          <EmptyStateLayout content="Nothing due for follow-up right now." />
        ) : (
          <Table colCount={6} rowCount={queue.length}>
            <Thead>
              <Tr>
                <Th><Typography variant="sigma">Job</Typography></Th>
                <Th><Typography variant="sigma">Company</Typography></Th>
                <Th><Typography variant="sigma">Unpublished</Typography></Th>
                <Th><Typography variant="sigma">Last follow-up</Typography></Th>
                <Th><Typography variant="sigma">Days overdue</Typography></Th>
                <Th><Typography variant="sigma">Source</Typography></Th>
                <Th><VisuallyHiddenLabel /></Th>
              </Tr>
            </Thead>
            <Tbody>
              {queue.map((job) => (
                <Tr key={job.id}>
                  <Td>
                    <Link to={`/content-manager/collection-types/api::job.job/${job.id}`}>
                      <Typography textColor="primary600">{job.title}</Typography>
                    </Link>
                  </Td>
                  <Td><Typography>{job.companyName || '—'}</Typography></Td>
                  <Td><Typography>{formatDate(job.unpublishedAt)}</Typography></Td>
                  <Td><Typography>{formatDate(job.lastFollowUpAt)}</Typography></Td>
                  <Td><Typography>{job.daysSinceEffective} days</Typography></Td>
                  <Td>
                    <Badge backgroundColor={job.wasAutoExpired ? 'neutral150' : 'primary100'}>
                      {job.wasAutoExpired ? 'Auto-expired' : 'Manually unpublished'}
                    </Badge>
                  </Td>
                  <Td>
                    <Button
                      variant="tertiary"
                      loading={markingId === job.id}
                      disabled={markingId === job.id}
                      onClick={() => handleMarkFollowedUp(job.id)}
                    >
                      Mark followed up
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

export default FollowUps;
