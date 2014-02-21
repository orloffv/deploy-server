var
    githubhook = require('githubhook')
    deploy = require('./deploy');

var github = githubhook({
    port: deploy.config.get('port'),
    host: deploy.config.get('host'),
    secret: deploy.config.get('secret'),
    logger: {
        log: function(message) {
            deploy.logger.info(message);
        },
        error: function(message) {
            deploy.logger.error(message);
        }
    }
});

github.listen();


github.on('push', function (repo, ref, data) {
    if (ref === 'master') {
        deploy.deployProject(repo);
    }
});

