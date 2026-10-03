import { Clock, CheckCircle, ChartPie } from '@strapi/icons';

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
    app.addMenuLink({
      to: '/application-review',
      icon: CheckCircle,
      intlLabel: {
        id: 'application-review.plugin.name',
        defaultMessage: 'Application Review',
      },
      Component: () => import('./pages/ApplicationReview'),
      permissions: [],
    });
    app.addMenuLink({
      to: '/analytics',
      icon: ChartPie,
      intlLabel: {
        id: 'plausible-dashboard.plugin.name',
        defaultMessage: 'Analytics',
      },
      Component: () => import('./pages/Analytics'),
      permissions: [],
    });
  },
};
