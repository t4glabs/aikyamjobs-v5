'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::telegram-subscriber.telegram-subscriber');
