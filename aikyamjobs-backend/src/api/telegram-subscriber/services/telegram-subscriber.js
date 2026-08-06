'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::telegram-subscriber.telegram-subscriber');
