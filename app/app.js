var deploy = require('./deploy');
deploy.deployProject(deploy.config.argv({
    "p": {
        alias: "project",
        describe: "Project name",
        demand: true,
        default: null
    }
}));
