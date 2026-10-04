import React, { useCallback, useEffect, useState } from 'react';
import {
  useFetchClient,
  useNotification,
  LoadingIndicatorPage,
} from '@strapi/helper-plugin';
import { Main } from '@strapi/design-system/Main';
import { HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import { Alert } from '@strapi/design-system/Alert';

// This instance's Goal Conversions panel throws an internal server error on
// the "All time" range (confirmed by hand -- likely a CE performance limit
// with this many goals over a long history), so "All time" isn't offered
// here at all -- only ranges confirmed to actually load.
const PERIODS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '28d', label: 'Last 28 days' },
  { value: '91d', label: 'Last 91 days' },
];

// Plausible's shared-dashboard embed doesn't support deep-linking straight
// to the Goal Conversions panel (confirmed by hand -- the /conversions path
// only exists as in-app client routing once the base dashboard has already
// booted, a fresh load of that URL 404s; there's also no DOM id on that
// panel to scroll to via a URL fragment). It sits a bit below the traffic
// charts in the same embed, which is why the callout below points it out
// explicitly rather than the page being able to jump straight to it.
const IFRAME_HEIGHT = 2200;

const Analytics = () => {
  const { get } = useFetchClient();
  const toggleNotification = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [embedUrl, setEmbedUrl] = useState(null);
  const [period, setPeriod] = useState('28d');
  const [errorMessage, setErrorMessage] = useState(null);

  const fetchEmbedUrl = useCallback(async (p) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { data } = await get(`/admin/plausible-dashboard/embed-url?period=${p}`);
      setEmbedUrl(data.url);
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        'Could not load the Plausible embed URL.';
      setErrorMessage(message);
      toggleNotification({ type: 'warning', message });
    } finally {
      setIsLoading(false);
    }
  }, [get, toggleNotification]);

  useEffect(() => {
    fetchEmbedUrl(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  if (isLoading && !embedUrl && !errorMessage) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Main>
      <HeaderLayout
        title="Analytics"
        subtitle="Live Plausible dashboard for aikyamjobs.org — embedded, not a copy."
      />
      <ContentLayout>
        {/* Only replaces the whole page with the error state on a first-load
            failure (misconfigured env vars, nothing to show yet). A failed
            period-switch refetch keeps the last-good embed on screen --
            the toast in fetchEmbedUrl already surfaces that one -- rather
            than wiping out a perfectly working dashboard over a transient
            error. */}
        {errorMessage && !embedUrl ? (
          <Alert
            closeLabel="Close"
            title="Analytics isn't configured yet"
            variant="danger"
          >
            {errorMessage}
          </Alert>
        ) : (
          <>
            <Box marginBottom={4}>
              <Alert closeLabel="Close" title="Look for Goal Conversions & Properties" variant="default">
                That&rsquo;s the data this page exists for — job saves, applications, PDF downloads,
                zero-result searches, and the rest. It sits a bit below the traffic charts inside the
                embed below, under its own &ldquo;Goals&rdquo; / &ldquo;Properties&rdquo; tabs — scroll down to find it.
              </Alert>
            </Box>

            <Flex gap={2} marginBottom={4}>
              <Typography variant="pi" textColor="neutral600">Range:</Typography>
              {PERIODS.map((p) => (
                <Button
                  key={p.value}
                  variant={period === p.value ? 'default' : 'tertiary'}
                  size="S"
                  onClick={() => setPeriod(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </Flex>

            <Box
              background="neutral0"
              hasRadius
              shadow="tableShadow"
              overflow="hidden"
              borderColor="neutral150"
            >
              <iframe
                key={embedUrl}
                src={embedUrl}
                title="Plausible Analytics — aikyamjobs.org"
                width="100%"
                height={IFRAME_HEIGHT}
                style={{ border: 'none', display: 'block' }}
                loading="lazy"
              />
            </Box>

            <Box marginTop={4}>
              <Typography variant="pi" textColor="neutral600">
                Dashboard not rendering right, or want it bigger?{' '}
                <a href={embedUrl} target="_blank" rel="noreferrer">
                  Open it in a new tab →
                </a>
              </Typography>
            </Box>
          </>
        )}
      </ContentLayout>
    </Main>
  );
};

export default Analytics;
