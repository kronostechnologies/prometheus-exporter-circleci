# prometheus-exporter-circleci
Prometheus exporter for CircleCI. Only projects followed will be considered, this is a limitation of CircleCI's API.

## Metrics
All metrics can be found in `src/metrics.ts` file.

At the moment, the builds time are collected in an Histogram, with these labels :
- Repository owner (owner)
- Repository (repo)
- Branch (branch)
- Success (success, "true" or "false")
- Workflow ID (workflow)
- Workflow Job ID (workflow_job)
- Workflow Upstream Jobs (upstream_jobs)

## Development
### Run & Watch
Start ts-node-dev on port 9600.
`yarn start`

### Build & Run with Docker
```
docker build . -t prometheus-exporter-circleci
docker run -e CIRCLECI_TOKEN=your-circleci-token -e CIRCLECI_ORGANIZATION=org -e LOG_LEVEL=silly -p 9600:9600 --rm -it prometheus-exporter-circleci
```
Server is accessible on http://localhost:9600/metrics

For development, add sources
```
docker run -e CIRCLECI_TOKEN=your-circleci-token -e CIRCLECI_ORGANIZATION=org -e LOG_LEVEL=silly -v $(pwd):/app -p 9600:9600 --rm --entrypoint yarn -it prometheus-exporter-circleci start
```

### Integration with Prometheus
A docker-compose file provide integration with prometheus server.
```
export CIRCLECI_TOKEN=your-circleci-personal-token
export CIRCLECI_ORGANIZATION=org
docker-compose up
```

### Lint
```
yarn lint
```

## Environment Variables
#### LOG_LEVEL
Value in `silly`, `debug`, `verbose`, `info`, `warn`, `error`.
Default `info`.
See [winston](https://www.npmjs.com/package/winston).
#### LOG_FORMAT
Value in `json`, `prettyPrint`. Some format described in winston documentation may not be working so stick with `prettyPrint` or `json` unless you know what you are doing.
Default `json`.
See [log format](https://github.com/winstonjs/logform#formats) for more possible format.
#### NODE_ENV
Value in `development`, `production`.
Default `production`.
#### CIRCLECI_TOKEN
Personal access token. Only projects followed by the user will be considered. This is a limitation of CircleCI's API.
See [Creating a Personal API Token](https://circleci.com/docs/2.0/managing-api-tokens/#creating-a-personal-api-token).
#### CIRCLECI_ORGANIZATION
Organisation name.
#### HTTP_PORT
Port number the http server will listen to.
Default `9600`.
### SCRAPE_BUILDS_PER_PAGE
Number of builds per page. Maximum `100`.
Default `100`.
### SCRAPE_MAX_PAGES
Maximum number of pages to scrape. This is mostly for testing purposes.
Default Scrape all pages
### SCRAPE_SINCE
The number of milliseconds to go back. Builds older than this number will be ignored.
Default `86400000` (one day).
