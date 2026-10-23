import React, { useState } from 'react';
import { Box, Flex, Typography, Button, Textarea, Badge, Field } from '@strapi/design-system';

import { useFetchClient, useNotification } from '@strapi/strapi/admin';

/**
 * Shared between Detail.js (job applications) and CvReviewDetail.js (CV
 * Improver) — lets HR paste/edit an applicant's CV mindmap JSON right where
 * they're already reviewing that person's CV, instead of needing Content
 * Manager open in a second tab to reach the same field on the Applicant.
 * Saving goes through the same entityService.update() as a Content Manager
 * edit would, so the existing PDF-regeneration lifecycle hook fires exactly
 * the same way — this is only a more convenient door into it, not a second
 * mechanism.
 */
const CvMindmapControl = ({ applicantId, cvMindmapJson, cvMindmapPdf, onChange }) => {
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(() => (cvMindmapJson ? JSON.stringify(cvMindmapJson, null, 2) : ''));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const hasMindmap = !!cvMindmapJson;

  const startEditing = () => {
    setText(cvMindmapJson ? JSON.stringify(cvMindmapJson, null, 2) : '');
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError('Not valid JSON — check for a missing comma or bracket.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const { data } = await post(`/admin/application-review/applicants/${applicantId}/cv-mindmap`, {
        cvMindmapJson: parsed,
      });
      onChange({ cvMindmapJson: data.cvMindmapJson, cvMindmapPdf: data.cvMindmapPdf });
      setEditing(false);
      toggleNotification({
        type: 'success',
        message: data.cvMindmapPdf
          ? 'Saved — the CV mindmap PDF is ready.'
          : 'Saved.',
      });
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Could not save this JSON.');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <Box background="neutral0" hasRadius borderColor="neutral150" padding={5}>
        <Flex justifyContent="space-between" alignItems="center" gap={4}>
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Flex gap={2} alignItems="center">
              <Typography variant="delta">CV mindmap</Typography>
              <Badge backgroundColor={hasMindmap ? 'success100' : 'neutral150'} textColor={hasMindmap ? 'success700' : 'neutral600'}>
                {hasMindmap ? 'Added' : 'Missing'}
              </Badge>
            </Flex>
            <Typography variant="pi" textColor="neutral600">
              {cvMindmapPdf
                ? 'PDF ready for this candidate.'
                : hasMindmap
                  ? 'JSON saved, but no PDF yet — try saving again.'
                  : 'Paste the generated JSON here to give this candidate a downloadable CV mindmap PDF.'}
            </Typography>
          </Flex>
          <Flex gap={2}>
            {cvMindmapPdf && (
              <a href={cvMindmapPdf.url} target="_blank" rel="noreferrer">
                <Button variant="tertiary">View PDF ↗</Button>
              </a>
            )}
            <Button variant="secondary" onClick={startEditing}>
              {hasMindmap ? 'Edit JSON' : 'Add JSON'}
            </Button>
          </Flex>
        </Flex>
      </Box>
    );
  }

  return (
    <Box background="neutral0" hasRadius borderColor="neutral150" padding={5}>
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Typography variant="delta">CV mindmap JSON</Typography>
        <Field.Root name="cvMindmapJson">
          <Field.Label>Paste the generated JSON</Field.Label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} />
        </Field.Root>
        {error && (
          <Typography variant="pi" textColor="danger600">{error}</Typography>
        )}
        <Flex gap={3}>
          <Button onClick={save} loading={saving} disabled={saving || !text.trim()}>
            Save
          </Button>
          <Button variant="tertiary" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};

export default CvMindmapControl;
