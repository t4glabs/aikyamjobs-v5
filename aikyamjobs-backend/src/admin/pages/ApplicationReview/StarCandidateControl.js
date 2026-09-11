import React, { useState } from 'react';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import { Textarea } from '@strapi/design-system/Textarea';

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Shared between Detail.js (job applications) and CvReviewDetail.js (CV
 * Improver) — star status lives on the Applicant, not on either record, so
 * marking it from either screen means any future reviewer sees it. Never
 * rendered on anything applicant-facing; this is an admin-only signal.
 */
const StarCandidateControl = ({
  applicantId,
  isStarCandidate,
  starCandidateNote,
  starCandidateMarkedByAdminEmail,
  starCandidateMarkedAt,
  onChange,
}) => {
  const { post } = useFetchClient();
  const toggleNotification = useNotification();
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (nextIsStarCandidate, noteValue) => {
    setSaving(true);
    try {
      const { data } = await post(`/admin/application-review/applicants/${applicantId}/star`, {
        isStarCandidate: nextIsStarCandidate,
        note: noteValue,
      });
      onChange({
        isStarCandidate: data.isStarCandidate,
        starCandidateNote: data.starCandidateNote,
        starCandidateMarkedByAdminEmail: data.starCandidateMarkedByAdminEmail,
        starCandidateMarkedAt: data.starCandidateMarkedAt,
      });
      setShowNoteInput(false);
      setNote('');
      toggleNotification({
        type: 'success',
        message: nextIsStarCandidate ? 'Marked as a star candidate.' : 'Removed star status.',
      });
    } catch (error) {
      toggleNotification({ type: 'warning', message: 'Could not update star status.' });
    } finally {
      setSaving(false);
    }
  };

  if (isStarCandidate) {
    return (
      <Box background="warning100" hasRadius borderColor="warning200" padding={5}>
        <Flex justifyContent="space-between" alignItems="flex-start" gap={4}>
          <Box>
            <Typography variant="delta">⭐ Star candidate</Typography>
            <Typography as="p" variant="omega" marginTop={2}>
              {starCandidateNote}
            </Typography>
            <Typography as="p" variant="pi" textColor="neutral600" marginTop={2}>
              {`Marked by ${starCandidateMarkedByAdminEmail || 'someone'} on ${formatDate(starCandidateMarkedAt)}. `}
              Future applications and CV Improver requests from this person skip the gated review
              and go straight to approved.
            </Typography>
          </Box>
          <Button variant="tertiary" onClick={() => submit(false, null)} loading={saving}>
            Remove star
          </Button>
        </Flex>
      </Box>
    );
  }

  return (
    <Box background="neutral0" hasRadius borderColor="neutral150" padding={5}>
      {!showNoteInput ? (
        <Flex justifyContent="space-between" alignItems="center" gap={4}>
          <Typography variant="pi" textColor="neutral600">
            Know this person is a standout? Mark them a star candidate so anyone reviewing them next
            sees it — and they'll skip the gated wait on future applications.
          </Typography>
          <Button variant="secondary" onClick={() => setShowNoteInput(true)}>
            ⭐ Mark as star candidate
          </Button>
        </Flex>
      ) : (
        <Flex direction="column" alignItems="stretch" gap={3}>
          <Textarea
            label="Why are they a good candidate?"
            hint="Required — this is what future reviewers will see."
            name="starNote"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Flex gap={3}>
            <Button
              variant="secondary"
              onClick={() => submit(true, note)}
              loading={saving}
              disabled={!note.trim()}
            >
              Save
            </Button>
            <Button variant="tertiary" onClick={() => setShowNoteInput(false)} disabled={saving}>
              Cancel
            </Button>
          </Flex>
        </Flex>
      )}
    </Box>
  );
};

export default StarCandidateControl;
