import { Clock, CheckCircle, ChartPie } from '@strapi/icons';
import CompanyMindmapCheck from './components/CompanyMindmapCheck';

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

    // Lets HR check/add a Company's mindmap JSON right from the Job edit
    // screen, instead of needing Content Manager open on the Company in a
    // second tab. Renders on every content type's edit view (that's how
    // this injection zone works) but the component itself only shows
    // anything on api::job.job.
    app.injectContentManagerComponent('editView', 'right-links', {
      name: 'company-mindmap-check',
      slug: 'company-mindmap-check',
      Component: CompanyMindmapCheck,
    });
  },
};
