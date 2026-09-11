import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFetchClient, useNotification, LoadingIndicatorPage } from '@strapi/helper-plugin';
import { Main } from '@strapi/design-system/Main';
import { HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import { TextButton } from '@strapi/design-system/TextButton';
import { Badge } from '@strapi/design-system/Badge';
import { Checkbox } from '@strapi/design-system/Checkbox';
import { Textarea } from '@strapi/design-system/Textarea';
import { Divider } from '@strapi/design-system/Divider';
import { Alert } from '@strapi/design-system/Alert';
import StarCandidateControl from './StarCandidateControl';

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const Detail = ({ id, onBack }) => {
  const { get, post } = useFetchClient();
  const toggleNotification = useNotification();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [reviewerChecked, setReviewerChecked] = useState([]);
  const [leadWithThese, setLeadWithThese] = useState('');
  const [fixBeforeSending, setFixBeforeSending] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [applicantItems, setApplicantItems] = useState(null);
  const [revealing, setRevealing] = useState(false);
  const [deciding, setDeciding] = useState(null); // 'approved' | 'rejected_with_tips' | null
  const [result, setResult] = useState(null); // decide() response, once submitted this session

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: d } = await get(`/admin/application-review/${id}`);
      setData(d);
      if (d.decision) {
        const items = d.decision.reviewerChecklist?.items || [];
        setReviewerChecked(d.job.requirementChecklist.map((_, i) => !!items[i]?.checked));
        setLeadWithThese(d.decision.leadWithThese || '');
        setFixBeforeSending(d.decision.fixBeforeSending || '');
        setRevealed(true);
        setApplicantItems(d.applicantChecklist.items);
      } else {
        setReviewerChecked(d.job.requirementChecklist.map(() => false));
        setLeadWithThese('');
        setFixBeforeSending('');
        setRevealed(false);
        setApplicantItems(null);
      }
      setResult(null);
    } catch (error) {
      toggleNotification({ type: 'warning', message: 'Could not load this application.' });
    } finally {
      setIsLoading(false);
    }
  }, [id, get, toggleNotification]);

  useEffect(() => {
    load();
  }, [load]);

  const reveal = async () => {
    setRevealing(true);
    try {
      const { data: r } = await get(`/admin/application-review/${id}/applicant-answers`);
      setApplicantItems(r.items);
      setRevealed(true);
    } catch (error) {
      toggleNotification({ type: 'warning', message: "Could not load the applicant's self-score." });
    } finally {
      setRevealing(false);
    }
  };

  const decide = async (decision) => {
    setDeciding(decision);
    try {
      const { data: r } = await post(`/admin/application-review/${id}/decide`, {
        reviewerChecked,
        leadWithThese,
        fixBeforeSending,
        decision,
      });
      setResult(r);
      toggleNotification({
        type: 'success',
        message: decision === 'approved' ? 'Marked as a good match.' : 'Marked as not a match.',
      });
      load();
    } catch (error) {
      toggleNotification({ type: 'warning', message: 'Could not save this decision.' });
    } finally {
      setDeciding(null);
    }
  };

  const reviewerCount = useMemo(() => reviewerChecked.filter(Boolean).length, [reviewerChecked]);

  if (isLoading || !data) return <LoadingIndicatorPage />;

  const { job, applicant, cv, applicantChecklist, decision, previousDecisionSummary } = data;
  const alreadyDecided = !!decision;
  const noApplyTarget = !job.applicationUrl && !job.applicationEmail;

  return (
    <Main>
      <HeaderLayout
        title={`${applicant.isStarCandidate ? '⭐ ' : ''}${applicant.name || applicant.email}`}
        subtitle={`${job.title}${job.companyName ? ` · ${job.companyName}` : ''}`}
        navigationAction={<TextButton onClick={onBack}>← Back to queue</TextButton>}
      />
      <ContentLayout>
        <Flex direction="column" alignItems="stretch" gap={6}>
          {previousDecisionSummary && (
            <Alert variant="default" title="This is a reapplication">
              {previousDecisionSummary}
            </Alert>
          )}

          {alreadyDecided && (
            <Alert
              variant={decision.reviewerPercent >= 50 ? 'success' : 'default'}
              title={`Already decided — ${new Date(decision.decisionAt).toLocaleString('en-IN')}`}
            >
              {decision.decisionNote
                ? decision.decisionNote
                : `Reviewed by ${decision.decisionByAdminEmail || 'someone'}. `}
              {decision.decisionEmailSent
                ? ' The outcome email was sent.'
                : ' The outcome email was NOT sent (auto-email is off, or it failed — check with the applicant manually).'}
              {' You can change and re-save the decision below if needed.'}
            </Alert>
          )}

          {noApplyTarget && (
            <Alert variant="warning" title="No apply link on file">
              This job has no applicationUrl or applicationEmail set — approving it now would send an
              email with nothing to click. Add one on the Job before marking this a good match.
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

          {/* Applicant + CV */}
          <Box background="neutral0" hasRadius borderColor="neutral150" padding={5}>
            <Grid gap={4}>
              <GridItem col={4}>
                <Typography variant="sigma" textColor="neutral600">Applicant</Typography>
                <Typography variant="omega" fontWeight="semiBold" as="p">
                  {applicant.name || '—'}
                </Typography>
                <Typography variant="pi" textColor="neutral600" as="p">{applicant.email}</Typography>
              </GridItem>
              <GridItem col={4}>
                <Typography variant="sigma" textColor="neutral600">Submitted</Typography>
                <Typography variant="omega" as="p">{formatDate(data.submittedAt)}</Typography>
                <Typography variant="pi" textColor="neutral600" as="p">
                  Consent given: {data.consent ? 'yes' : 'no'}
                </Typography>
              </GridItem>
              <GridItem col={4}>
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
              </GridItem>
            </Grid>
          </Box>

          {/* Applicant's aggregate score — safe to show upfront, per-item hidden until reveal */}
          <Box background="neutral0" hasRadius borderColor="neutral150" padding={5}>
            <Typography variant="omega" textColor="neutral600">
              {`They rated their own fit at ${applicantChecklist.percent}% (${applicantChecklist.score}/${applicantChecklist.max} ticked)`}
              {applicantChecklist.requiredMissing.length > 0 &&
                ` — missing: ${applicantChecklist.requiredMissing.join(', ')}`}
              {`. Which of these does the CV itself actually prove?`}
            </Typography>
          </Box>

          {/* Reviewer's own checklist */}
          <Box background="neutral0" hasRadius borderColor="neutral150" padding={5}>
            <Flex justifyContent="space-between" alignItems="center" marginBottom={4}>
              <Typography variant="delta">Does the CV prove it?</Typography>
              <Typography variant="pi" textColor="neutral600">
                {reviewerCount} of {job.requirementChecklist.length}
              </Typography>
            </Flex>
            <Flex direction="column" alignItems="stretch" gap={3}>
              {job.requirementChecklist.map((item, i) => {
                const theirs = revealed && applicantItems ? applicantItems[i] : null;
                return (
                  <Box key={i} padding={3} background="neutral100" hasRadius>
                    <Flex justifyContent="space-between" alignItems="center">
                      <Checkbox
                        value={reviewerChecked[i]}
                        onValueChange={(val) => {
                          const next = [...reviewerChecked];
                          next[i] = val;
                          setReviewerChecked(next);
                        }}
                      >
                        {item.label}
                        {item.required && (
                          <Typography variant="pi" textColor="primary600"> · essential</Typography>
                        )}
                      </Checkbox>
                      {theirs && (
                        <Badge
                          backgroundColor={theirs.checked ? 'success100' : 'neutral150'}
                          textColor={theirs.checked ? 'success700' : 'neutral600'}
                        >
                          {theirs.checked ? 'they ticked this' : "they didn't"}
                        </Badge>
                      )}
                    </Flex>
                  </Box>
                );
              })}
            </Flex>

            {!revealed ? (
              <Box marginTop={4}>
                <Button variant="secondary" onClick={reveal} loading={revealing}>
                  Reveal their self-score
                </Button>
                <Typography as="p" variant="pi" textColor="neutral600" marginTop={2}>
                  Score the CV yourself first — their answers unlock once you do, so you're not
                  anchored by what they claimed.
                </Typography>
              </Box>
            ) : (
              <Typography as="p" variant="pi" textColor="neutral600" marginTop={4}>
                Where you ticked more than they did, the CV proves more than they gave it credit for.
                Where you ticked less, it isn't on the page yet.
              </Typography>
            )}
          </Box>

          {/* Reviewer notes */}
          <Grid gap={4}>
            <GridItem col={6}>
              <Textarea
                label="Lead with these"
                hint="A couple of strengths worth pointing at, for the approval email."
                name="leadWithThese"
                value={leadWithThese}
                onChange={(e) => setLeadWithThese(e.target.value)}
              />
            </GridItem>
            <GridItem col={6}>
              <Textarea
                label="Fix before sending"
                hint="Concrete edits — what's missing, not what to invent. This becomes the no-match email if it's not a fit."
                name="fixBeforeSending"
                value={fixBeforeSending}
                onChange={(e) => setFixBeforeSending(e.target.value)}
              />
            </GridItem>
          </Grid>

          <Divider />

          {/* Decision */}
          {result && (
            <Alert variant="success" title="Decision saved">
              {`Reviewer score: ${result.reviewerPercent}%. `}
              {result.autoSendEnabled
                ? result.emailSent
                  ? 'The outcome email was sent to the applicant.'
                  : 'Auto-email is on, but sending failed — check the server log and notify them manually.'
                : 'Auto-email is OFF — nothing was sent. Remember to email the applicant yourself, or turn it on in Site Settings once you trust the workflow.'}
            </Alert>
          )}

          <Flex gap={3}>
            <Button
              variant="success"
              onClick={() => decide('approved')}
              loading={deciding === 'approved'}
              disabled={deciding !== null}
            >
              Good match — send the apply link
            </Button>
            <Button
              variant="tertiary"
              onClick={() => decide('rejected_with_tips')}
              loading={deciding === 'rejected_with_tips'}
              disabled={deciding !== null}
            >
              Not a match — send the read
            </Button>
          </Flex>
          <Typography variant="pi" textColor="neutral600">
            Either way, the decision is saved immediately below and the applicant's results page updates.
          </Typography>
        </Flex>
      </ContentLayout>
    </Main>
  );
};

export default Detail;
