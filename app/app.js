var deploy = require('./deploy');
deploy.config.argv({
    "p": {
        alias: "project",
        describe: "Project name",
        demand: true,
        default: null
    }
});
deploy.deployProject(deploy.config.get('project'));
