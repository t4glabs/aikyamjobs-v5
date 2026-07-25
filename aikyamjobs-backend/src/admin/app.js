import { Clock } from '@strapi/icons';

export default {
  config: {},
  bootstrap(app) {
    app.addMenuLink({
      to: '/follow-ups',
      icon: Clock,
      intlLabel: {
        id: 'follow-ups.plugin.name',
        defaultMessage: 'Follow-ups',
      },
      Component: () => import('./pages/FollowUps'),
      permissions: [],
    });
  },
};
