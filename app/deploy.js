(function () {
    "use strict";
    module.exports = function() {
        var config = require('nconf'),
            winston = require('winston'),
            path = require('path'),
            async = require('async'),
            _ = require('underscore'),
            exec = require('child_process').exec;

        config.argv().env();
        var environment = config.get('NODE_ENV') === 'production' ? 'config' : 'development';
        config.file({ file: path.normalize(__dirname + '/config/' + environment + '.json') });

        var transports = [];

        transports.push(
            new winston.transports.Console({
                handleExceptions: true,
                colorize:   true,
                timestamp: true,
                level: 'debug'
            })
        );

        if (config.get('loggly')) {
            transports.push(
                new winston.transports.Loggly({
                    subdomain: config.get('loggly:subdomain'),
                    inputToken: config.get('loggly:inputToken'),
                    auth: {
                        "username": config.get('loggly:username'),
                        "password": config.get('loggly:password')
                    },
                    level: 'info',
                    tags: ['deploy-server']
                })
            );
        }


        var logger = new winston.Logger({
            transports: transports,
            exitOnError: false
        });

        var projects = config.get('projects');

        var execCommands = function(commands, variables, callback) {
            if (!_.isArray(commands)) {
                commands = [commands];
            }

            async.series(
                _.map(commands, function(command) {
                    return function(cb) {
                        command = replaceVariables(command, variables);
                        logger.info('run command:', command);
                        exec(replaceVariables(command, variables), function(err, stdout, stderr) {
                            if (!err) {
                                logger.debug('command:', 'done');
                            } else {
                                logger.error('command:', 'error', stderr);
                            }

                            cb(err);
                        });
                    };
                }),
                callback
            );
        };

        var replaceAll = function(variable, search, replace) {
            variable = _.isString(variable) || _.isNumber(variable) ? variable : '';
            variable = String(variable);

            return variable.split(search).join(replace);
        };

        var replaceVariables = function(line, variables) {
            if (variables) {
                _.each(variables, function(value, key) {
                    line = replaceAll(line, '{{' + key + '}}', value);
                });
            }

            return line;
        };

        var deployProject = function(name) {
            if (!projects || !projects[name]) {
                logger.error('project not found', name);

                return false;
            }

            var project = projects[name];
            logger.info('deploy:', 'started', name);
            async.series(
                [
                    function(callback) {
                        execCommands(project.before, project.variables, callback);
                    },
                    function(callback) {
                        execCommands(project.deploy, project.variables, callback);
                    }
                ],
                function(err, result) {
                    if (!err) {
                        execCommands(project.after, project.variables, function(err, result) {
                            if (!err) {
                                logger.info('deploy:', 'done', name);
                            } else {
                                execCommands(project.error, project.variables);
                            }
                        });
                    } else {
                        logger.error('deploy:', 'error', name);
                        execCommands(project.error, project.variables);
                    }
                }
            );
        };

        return {
            deployProject: deployProject,
            logger: logger,
            config: config
        }
    }();
})();
