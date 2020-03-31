import { createTerminus, HealthCheckError, TerminusOptions } from '@godaddy/terminus';
import express from 'express';
import { createServer, Server } from 'http';
import Prometheus from 'prom-client';
import { CircleCiClient } from './circleci-client';
import { CircleCiExporter } from './circleci-exporter';
import appConfig from './config';
import logger from './logger';
import { ScrapeStatus } from './scrape-status';

// Debug environment configuration
logger.silly('Environment variables');
logger.silly(process.env);
logger.silly('Configuration');
logger.silly(appConfig);

const pagingOptions = {
    limit: appConfig.scrape.buildsPerPage,
    maxPages: appConfig.scrape.maxPages,
    since: appConfig.scrape.since,
};

const exporter = new CircleCiExporter(new CircleCiClient(appConfig.circleci), new ScrapeStatus());
const app = express();
const server: Server = createServer(app);

let initialScrapingFinished = false;

async function healthCheck(): Promise<any> {
    if (!initialScrapingFinished) {
        throw new HealthCheckError('healthcheck failed', ['Initial scraping not finished']);
    }
    return {};
}

async function onSignal(): Promise<any> {
    logger.info('caught signal. Starting cleanup');
}

async function onShutdown(): Promise<any> {
    logger.info('cleanup finished, server is shutting down');
}

const terminusOptions: TerminusOptions = {
    healthChecks: {
        '/healthcheck': healthCheck,
    },
    signals: [ 'SIGINT', 'SIGTERM' ],
    onSignal,
    onShutdown,
    logger: logger.info,
};

createTerminus(server, terminusOptions);

server.listen(appConfig.http.port, async () => {
    logger.info(`App server listening on port ${appConfig.http.port}!`);
});

exporter.export(pagingOptions).then(() => {
    app.get('/metrics', async (_, res) => {
        logger.debug('/metrics hit');

        try {
            await exporter.export(pagingOptions);
        } catch (err) {
            logger.error(err);
        }

        res.set('Content-Type', Prometheus.register.contentType);
        res.end(Prometheus.register.metrics());
    });
    initialScrapingFinished = true;
}).catch(logger.error);
