'use strict';

// Public, passwordless magic-link routes. auth:false = no users-permissions
// token required (these are the entry points, before an applicant has a JWT).
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/apply/auth/request',
      handler: 'applicant.requestLink',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/apply/auth/verify',
      handler: 'applicant.verify',
      config: { auth: false },
    },
  ],
};
