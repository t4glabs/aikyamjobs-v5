import React, { useCallback, useEffect, useState } from 'react';
import { Box, Flex, Typography } from '@strapi/design-system';
import { Button } from '@strapi/design-system';
import { Textarea } from '@strapi/design-system';
import { Badge } from '@strapi/design-system';
import { Field } from '@strapi/design-system';

import { useFetchClient, useNotification, useForm } from '@strapi/strapi/admin';

/**
 * Registered as an edit-view side panel via src/admin/app.js's
 * addEditViewSidePanel call. That API runs this function on EVERY content
 * type's edit view (not just Job's), so it self-gates on `model` and returns
 * null (no panel at all) anywhere else.
 *
 * Strapi 5 removed the old injectContentManagerComponent/
 * useCMEditViewDataManager pair this used to run on. `model`/`documentId`/
 * `document` now come from the panel's own props (EditViewContext).
 *
 * Resolving the currently-selected company is trickier than it looks in v5:
 * `document.company` is the *saved* relation (flat object, correct for the
 * common case of just opening an existing job), but `useForm`'s live
 * `form.values.company` is NOT the full relation value the way v4's
 * modifiedData.company was -- it's a diff of pending edits,
 * `{ connect?: [...], disconnect?: [...] }`, that only has anything in it
 * once the user actually changes the field in this session. Reading only
 * the live form value (the original, v4-era approach) meant the panel
 * found nothing for any job whose company was set in a prior save --
 * i.e. almost every real job. Fixed by treating the live pending edit as an
 * override on top of the saved document state, not the sole source.
 *
 * Company's mindmapJson is `private: true` (never sent in the relation
 * picker's payload), so this always re-fetches the real status from the
 * server rather than trusting whatever the Job form's own relation data
 * happens to carry.
 */
function resolveCompanyId(document, pendingCompany) {
  const connected = pendingCompany?.connect;
  if (Array.isArray(connected) && connected.length > 0) {
    // Last connect wins -- matches a single-select relation always
    // replacing, never accumulating, a pending pick.
    return connected[connected.length - 1].id;
  }
  const savedCompanyId = document?.company?.id ?? null;
  const disconnected = pendingCompany?.disconnect;
  if (Array.isArray(disconnected) && savedCompanyId != null) {
    if (disconnected.some((d) => d.id === savedCompanyId)) return null;
  }
  return savedCompanyId;
}

const CompanyMindmapCheck = ({ model, documentId, document }) => {
  const pendingCompany = useForm('CompanyMindmapCheck', (form) => form.values?.company);
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();

  const companyId = resolveCompanyId(document, pendingCompany);
  const jobId = documentId || null;

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

  if (model !== 'api::job.job') return null;

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

  let content;
  if (!companyId) {
    content = (
      <Typography as="p" variant="pi" textColor="neutral600">
        Pick a company above to check or add its mindmap JSON.
      </Typography>
    );
  } else if (loading && !status) {
    content = (
      <Typography variant="pi" textColor="neutral600">Checking company mindmap…</Typography>
    );
  } else {
    const hasMindmap = !!status?.mindmapJson;
    content = !editing ? (
      <Flex direction="column" alignItems="stretch" gap={2}>
        <Flex gap={2} alignItems="center">
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
        <Field.Root name="companyMindmapJson">
          <Field.Label>Paste the generated JSON</Field.Label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} />
        </Field.Root>
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
    );
  }

  return {
    title: 'Company mindmap',
    content: <Box padding={4}>{content}</Box>,
  };
};

export default CompanyMindmapCheck;
