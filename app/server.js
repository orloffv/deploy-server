var githubhook = require('githubhook');
var nconf = require('nconf');
var path = require('path');
var async = require('async');
var _ = require('underscore');

nconf.argv().env();
var environment = nconf.get('NODE_ENV') ? nconf.get('NODE_ENV') : 'development';
nconf.file({ file: path.normalize(__dirname + '/config/' + environment + '.json') });

var github = githubhook({
    port: nconf.get('port'),
    host: nconf.get('host'),
    secret: nconf.get('secret'),
    logger: {
        log: function(message) {
            console.log(message);
        },
        error: function(message) {
            console.error(message);
        }
    }
});

github.listen();

var projects = nconf.get('projects');

var execCommands = function(commands, callback) {
    if (!_.isArray(commands)) {
        commands = [commands];
    }

    async.parallel(
        _.map(commands, function(command) {
            return function(cb) {
                exec(command, function(err, result) {
                    cb(err, result);
                });
            };
        }),
        callback
    );
};

github.on('event', function (repo, ref, data) {
    if (projects[repo]) {
        var project = projects[repo];
        var beforeCommands = function(callback) {
            execCommands(project.before, callback);
        };

        var deployCommand = function(callback) {
            execCommands(project.deploy, callback);
        };

        var afterCommands = function(callback) {
            execCommands(project.after, callback);
        };
    }

    console.info(repo, ref, data);
});


