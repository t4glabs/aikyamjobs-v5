import React, { useCallback, useEffect, useState } from 'react';
import {
  Main,
  Box,
  Flex,
  Grid,
  Typography,
  Button,
  TextButton,
  Textarea,
  Divider,
  Alert,
  Field,
} from '@strapi/design-system';
import StarCandidateControl from './StarCandidateControl';
import CvMindmapControl from './CvMindmapControl';

import { Page, Layouts, useFetchClient, useNotification } from '@strapi/strapi/admin';

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const CvReviewDetail = ({ id, onBack }) => {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [leadWithThese, setLeadWithThese] = useState('');
  const [fixBeforeSending, setFixBeforeSending] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: d } = await get(`/admin/application-review/cv-reviews/${id}`);
      setData(d);
      setLeadWithThese(d.leadWithThese || '');
      setFixBeforeSending(d.fixBeforeSending || '');
      setResult(null);
    } catch (error) {
      toggleNotification({ type: 'warning', message: 'Could not load this CV Improver request.' });
    } finally {
      setIsLoading(false);
    }
  }, [id, get, toggleNotification]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const { data: r } = await post(`/admin/application-review/cv-reviews/${id}/decide`, {
        leadWithThese,
        fixBeforeSending,
      });
      setResult(r);
      toggleNotification({ type: 'success', message: 'Feedback saved.' });
      load();
    } catch (error) {
      toggleNotification({ type: 'warning', message: 'Could not save this feedback.' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !data) return <Page.Loading />;

  const { applicant, cv, targetRoles, reviewedAt, decisionEmailSent, decisionByAdminEmail } = data;
  const alreadyReviewed = data.status === 'reviewed';

  return (
    <Main>
      <Layouts.Header
        title={`${applicant.isStarCandidate ? '⭐ ' : ''}${applicant.name || applicant.email}`}
        subtitle="CV Improver request"
        navigationAction={<TextButton onClick={onBack}>← Back to queue</TextButton>}
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={6}>
          {alreadyReviewed && (
            <Alert variant="success" title={`Already reviewed — ${new Date(reviewedAt).toLocaleString('en-IN')}`}>
              {`Reviewed by ${decisionByAdminEmail || 'someone'}. `}
              {decisionEmailSent
                ? 'The feedback email was sent.'
                : 'The feedback email was NOT sent (auto-email is off, or it failed — check with the applicant manually).'}
              {' You can update and re-save the feedback below if needed.'}
            </Alert>
          )}

          <StarCandidateControl
            applicantId={applicant.id}
            isStarCandidate={applicant.isStarCandidate}
            starCandidateNote={applicant.starCandidateNote}
            starCandidateMarkedByAdminEmail={applicant.starCandidateMarkedByAdminEmail}
            starCandidateMarkedAt={applicant.starCandidateMarkedAt}
            onChange={(patch) =>
              setData((prev) => (prev ? { ...prev, applicant: { ...prev.applicant, ...patch } } : prev))
            }
          />

          <CvMindmapControl
            applicantId={applicant.id}
            cvMindmapJson={applicant.cvMindmapJson}
            cvMindmapPdf={applicant.cvMindmapPdf}
            onChange={(patch) =>
              setData((prev) => (prev ? { ...prev, applicant: { ...prev.applicant, ...patch } } : prev))
            }
          />

          {/* Applicant + CV */}
          <Box background="neutral0" hasRadius borderColor="neutral150" padding={5}>
            <Grid.Root gap={4}>
              <Grid.Item col={4}>
                <Typography variant="sigma" textColor="neutral600">Applicant</Typography>
                <Typography variant="omega" fontWeight="semiBold" as="p">
                  {applicant.name || '—'}
                </Typography>
                <Typography variant="pi" textColor="neutral600" as="p">{applicant.email}</Typography>
              </Grid.Item>
              <Grid.Item col={4}>
                <Typography variant="sigma" textColor="neutral600">Submitted</Typography>
                <Typography variant="omega" as="p">{formatDate(data.submittedAt)}</Typography>
                <Typography variant="pi" textColor="neutral600" as="p">
                  Consent given: {data.consent ? 'yes' : 'no'}
                </Typography>
              </Grid.Item>
              <Grid.Item col={4}>
                <Typography variant="sigma" textColor="neutral600">CV on file</Typography>
                <Typography as="p">
                  {cv ? (
                    <a href={cv.url} target="_blank" rel="noreferrer">
                      {cv.originalName || 'View CV ↗'}
                    </a>
                  ) : (
                    '—'
                  )}
                </Typography>
              </Grid.Item>
            </Grid.Root>
          </Box>

          {/* What they're targeting */}
          <Box background="neutral0" hasRadius borderColor="neutral150" padding={5}>
            <Typography variant="sigma" textColor="neutral600">What they're targeting</Typography>
            <Typography as="p" marginTop={1}>{targetRoles}</Typography>
          </Box>

          {/* Reviewer notes */}
          <Grid.Root gap={4}>
            <Grid.Item col={6}>
              <Field.Root
                name="leadWithThese"
                hint="A couple of strengths worth pointing at, for the feedback email."
              >
                <Field.Label>What's currently good</Field.Label>
                <Textarea value={leadWithThese} onChange={(e) => setLeadWithThese(e.target.value)} />
                <Field.Hint />
              </Field.Root>
            </Grid.Item>
            <Grid.Item col={6}>
              <Field.Root
                name="fixBeforeSending"
                hint="Concrete edits given what they said they're targeting — not a generic checklist."
              >
                <Field.Label>What needs changes</Field.Label>
                <Textarea value={fixBeforeSending} onChange={(e) => setFixBeforeSending(e.target.value)} />
                <Field.Hint />
              </Field.Root>
            </Grid.Item>
          </Grid.Root>

          <Divider />

          {result && (
            <Alert variant="success" title="Feedback saved">
              {result.autoSendEnabled
                ? result.emailSent
                  ? 'The feedback email was sent to the applicant.'
                  : 'Auto-email is on, but sending failed — check the server log and notify them manually.'
                : 'Auto-email is OFF — nothing was sent. Remember to email the applicant yourself, or turn it on in Site Settings once you trust the workflow.'}
            </Alert>
          )}

          <Flex gap={3}>
            <Button onClick={save} loading={saving} disabled={saving}>
              {alreadyReviewed ? 'Update feedback' : 'Save & mark reviewed'}
            </Button>
          </Flex>
          <Typography variant="pi" textColor="neutral600">
            Saving updates their results page immediately.
          </Typography>
        </Flex>
      </Layouts.Content>
    </Main>
  );
};

export default CvReviewDetail;
