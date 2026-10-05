import React, { useCallback, useEffect, useState } from 'react';
import { useFetchClient, useNotification, useCMEditViewDataManager } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import { Textarea } from '@strapi/design-system/Textarea';
import { Badge } from '@strapi/design-system/Badge';

/**
 * Injected into the content-manager's Job edit view (right sidebar) — see
 * src/admin/app.js's injectContentManagerComponent call. This zone renders
 * on EVERY content type's edit view, not just Job's, so this component
 * self-gates on `slug` and renders nothing anywhere else.
 *
 * The point: HR already has the Job open and has already picked its
 * Company in the relation field -- previously, checking or adding that
 * company's mindmap JSON meant leaving to open the Company separately.
 * Company's mindmapJson is `private: true` (never sent in the standard
 * relation-picker payload), so this always re-fetches the real status from
 * the server rather than trusting whatever the Job form's own relation
 * data happens to carry.
 */
const CompanyMindmapCheck = () => {
  const { slug, modifiedData, initialData, isCreatingEntry } = useCMEditViewDataManager();
  const { get, post } = useFetchClient();
  const toggleNotification = useNotification();

  // This Strapi version represents even a manyToOne relation's value as an
  // array (confirmed by hand: modifiedData.company was [{ id, name, ... }],
  // not a plain object) -- same shape Strapi's own generic relation-picker
  // component uses internally for every relation cardinality.
  const companyId = modifiedData?.company?.[0]?.id || null;
  const jobId = !isCreatingEntry ? initialData?.id : null;

  const [status, setStatus] = useState(null); // { companyName, mindmapJson } | null
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setStatus(null);
      return;
    }
    setLoading(true);
    try {
      const { data } = await get(`/admin/application-review/companies/${companyId}/mindmap`);
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, get]);

  useEffect(() => {
    setEditing(false);
    load();
  }, [load]);

  if (slug !== 'api::job.job') return null;
  if (!companyId) {
    return (
      <Box background="neutral0" hasRadius borderColor="neutral150" padding={4} marginTop={4}>
        <Typography variant="sigma" textColor="neutral600">Company mindmap</Typography>
        <Typography as="p" variant="pi" textColor="neutral600" marginTop={1}>
          Pick a company above to check or add its mindmap JSON.
        </Typography>
      </Box>
    );
  }
  if (loading && !status) {
    return (
      <Box background="neutral0" hasRadius borderColor="neutral150" padding={4} marginTop={4}>
        <Typography variant="pi" textColor="neutral600">Checking company mindmap…</Typography>
      </Box>
    );
  }

  const hasMindmap = !!status?.mindmapJson;

  const startEditing = () => {
    setText(status?.mindmapJson ? JSON.stringify(status.mindmapJson, null, 2) : '');
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
      const { data } = await post(`/admin/application-review/companies/${companyId}/mindmap`, {
        mindmapJson: parsed,
        jobIdToRefresh: jobId || undefined,
      });
      setStatus((prev) => ({ ...prev, mindmapJson: data.mindmapJson }));
      setEditing(false);
      toggleNotification({
        type: 'success',
        message: data.jobMindmapRefreshed
          ? "Saved — this job's mindmap PDF has been refreshed to include it."
          : jobId
            ? 'Saved. Re-save this job to refresh its mindmap PDF with the change.'
            : 'Saved — this will show up once this job (once created) has its own mindmap JSON and PDF.',
      });
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Could not save this JSON.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box background="neutral0" hasRadius borderColor="neutral150" padding={4} marginTop={4}>
      {!editing ? (
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Flex gap={2} alignItems="center">
            <Typography variant="sigma" textColor="neutral600">Company mindmap</Typography>
            <Badge backgroundColor={hasMindmap ? 'success100' : 'neutral150'} textColor={hasMindmap ? 'success700' : 'neutral600'}>
              {hasMindmap ? 'Added' : 'Missing'}
            </Badge>
          </Flex>
          <Typography variant="pi" textColor="neutral600">
            {status?.companyName}
            {hasMindmap
              ? ' — shows up as a section in this JD\'s mindmap PDF.'
              : ' has no mindmap JSON yet.'}
          </Typography>
          <Button variant="secondary" onClick={startEditing} size="S">
            {hasMindmap ? 'Edit JSON' : 'Add JSON'}
          </Button>
        </Flex>
      ) : (
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Typography variant="sigma" textColor="neutral600">Company mindmap JSON</Typography>
          <Textarea
            label="Paste the generated JSON"
            name="companyMindmapJson"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
          />
          {error && <Typography variant="pi" textColor="danger600">{error}</Typography>}
          <Flex gap={2}>
            <Button onClick={save} loading={saving} disabled={saving || !text.trim()} size="S">
              Save
            </Button>
            <Button variant="tertiary" onClick={() => setEditing(false)} disabled={saving} size="S">
              Cancel
            </Button>
          </Flex>
        </Flex>
      )}
    </Box>
  );
};

export default CompanyMindmapCheck;
