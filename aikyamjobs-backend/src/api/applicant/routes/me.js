'use strict';

// Applicant-authenticated routes (JWT via the is-applicant policy). auth:false
// disables the default users-permissions guard so our own policy runs instead.
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/apply/me',
      handler: 'applicant.me',
      config: { auth: false, policies: ['global::is-applicant'] },
    },
    {
      method: 'POST',
      path: '/apply/me/cv',
      handler: 'applicant.uploadCv',
      config: { auth: false, policies: ['global::is-applicant'] },
    },
  ],
};
