import express from 'express';
import { Server } from 'http';
import Prometheus from 'prom-client';
import { CircleCiClient } from './circleci-client';
import { CircleCiExporter } from './circleci-exporter';
import appConfig from './config';
import logger from './logger';
import { ScrapeStatus } from './scrape-status';
import Signals = NodeJS.Signals;

// Debug environment configuration
logger.silly('Environment variables');
logger.silly(process.env);
logger.silly('Configuration');
logger.silly(appConfig);

let server: Server | undefined;

const pagingOptions = {
    limit: appConfig.scrape.buildsPerPage,
    maxPages: appConfig.scrape.maxPages,
    since: appConfig.scrape.since,
};
const exporter = new CircleCiExporter(new CircleCiClient(appConfig.circleci), new ScrapeStatus());
exporter.export(pagingOptions).then(() => {
    // Start the server only after the first metrics collection is done
    const app = express();
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

    server = app.listen(appConfig.http.port, async () => {
        logger.info(`App server listening on port ${appConfig.http.port}!`);
    });
}).catch(logger.error);

// @ts-ignore
function doScrape(): void {
    exporter.export(pagingOptions).then(() => {
        setTimeout(doScrape, 60_000);
    }).catch(logger.error);
}

(['SIGINT', 'SIGTERM'] as Signals[]).forEach(signal => {
    process.on(signal, () => {
        logger.info(`Received signal ${signal}'`);
        server && server.close(err => {
            logger.info('Server is stopping');
            err && logger.error(err);
            process.exit(0);
        });
        // Make sure we forcefully stop the server even if server is still responding
        setTimeout(() => {
            logger.warn('Could not close connections in time, forcefully shutting down');
            process.exit(0);
        }, 2000);
    });
});
