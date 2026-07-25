module.exports = ({ env }) => ({
  'follow-ups': {
    enabled: true,
    resolve: './src/plugins/follow-ups',
  },
  upload: {
    config: {
      provider: 'local',
      sizeLimit: 100000000, // 100MB
      providerOptions: {},
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
      // This forces Strapi to use the PUBLIC_URL for all upload URLs
      breakpoints: {
        xlarge: 1920,
        large: 1000,
        medium: 750,
        small: 500,
        xsmall: 64,
      },
    },
  },
});
