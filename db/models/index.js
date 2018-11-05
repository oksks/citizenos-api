'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const config = require('config').util.loadFileConfigs('./config');
const db = {};
const URL = require('url').URL;


// Set up DB logging
const log4js = require('log4js');
log4js.configure(config.logging.log4js);
const logger = log4js.getLogger(process.env.NOTE_ENV);

var defaultLoggingFunction = function (query) {
    logger.debug('DB', query);
};

var dbOptions = config.db.options;
if (dbOptions.logging && typeof dbOptions.logging !== 'function') {
    dbOptions.logging = defaultLoggingFunction;
}

if (dbOptions.sync && dbOptions.sync.logging && typeof dbOptions.sync.logging !== 'function') {
    dbOptions.sync.logging = defaultLoggingFunction;
}

if (dbOptions.operatorsAliases === 'undefined') {
    dbOptions.operatorsAliases = Sequelize.Op;
}

var dbConfSanitized = JSON.parse(JSON.stringify(config.db));
if (process.env.NODE_ENV !== 'development') {
    dbConfSanitized.url = dbConfSanitized.url ? dbConfSanitized.url.replace(/\/\/.*:.*@/g, '//*****:*****@') : dbConfSanitized.url;
    dbConfSanitized.options.username = dbConfSanitized.options.username ? '*******' : dbConfSanitized.options.username;
    dbConfSanitized.options.password = dbConfSanitized.options.password ? '*******' : dbConfSanitized.options.password;
}

logger.info(
    'Sequelize connection configuration',
    dbConfSanitized
);

var sequelize;
if (config.db.url) {
    sequelize = new Sequelize(config.db.url, dbOptions);
} else {
    sequelize = new Sequelize(dbOptions);
}

sequelize
    .authenticate()
    .then(
        function () {
            logger.info('Successfully connected to DB');
        },
        function (err) {
            logger.error('Unable to connect do database. Bye bye!', err);
            process.exit(1);
        }
    );

fs
    .readdirSync(__dirname)
    .filter((file) => {
        return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js') && file.indexOf('_') !== 0;
    })
    .forEach((file) => {
        const model = sequelize.import(path.join(__dirname, file));
        db[model.name] = model;
    });

Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});


// IF PG is used we need to enable "parseInt8" so that counts would actually be numeric in JS - https://github.com/sequelize/sequelize/issues/2383
// Might want to find better place for this logic...
var pg = require('pg');

if (pg) {
    // pg is a singleton so the same instance is in Sequelize-s guts thus the settings work.
    pg.defaults.parseInt8 = true;
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
