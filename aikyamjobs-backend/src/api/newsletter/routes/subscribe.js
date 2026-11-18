'use strict';

// Public sign-up endpoint for the website /subscribe form. auth:false because
// visitors aren't logged in; the controller's Turnstile check is the gate.
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/newsletter/subscribe',
      handler: 'newsletter.subscribe',
      config: { auth: false },
    },
  ],
};
