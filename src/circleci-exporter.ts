import { Workflow } from 'circleci-api';
import { v4 as uuidv4 } from 'uuid';
import { BuildInfo, CircleCiClient } from './circleci-client';
import logger from './logger';
import * as Metrics from './metrics';
import { PagingOptions } from './paging-options';
import { ScrapeStatus } from './scrape-status';
import { getWorkflow, isFinished, isSuccess } from './utils';

type FinishedBuildInfo = BuildInfo & {
    branch: string;
    build_time_millis: number;
    lifecycle: string;
    outcome: string;
    status: string;
    queued_at: string;
    start_time: string;
    stop_time: string;
};

export class CircleCiExporter {
    private readonly client: CircleCiClient;
    private readonly previousScrapeStatus: ScrapeStatus;

    constructor(client: CircleCiClient, previousScrapeStatus: ScrapeStatus) {
        this.client = client;
        this.previousScrapeStatus = previousScrapeStatus;
    }

    public async export(pagingOptions: PagingOptions): Promise<Object> {
        logger.info('Starting scraping.');
        return new Promise((resolve, reject) => {
            const buildSummaryObservable = this.client.getRecentBuilds(pagingOptions, this.previousScrapeStatus);
            const artifactsSummaryObservable = this.client.getLatestArtifacts(pagingOptions, { retry: 0 });

            const scrapeStatus = new ScrapeStatus();
            scrapeStatus.lastScrapeTime = Date.now();
            buildSummaryObservable.subscribe(build => {
                scrapeStatus.updateFromBuild(build);
                this.collectMetrics(build);
            }, err => {
                logger.error(`Error scraping : ${err}`);
                reject(err);
            }, () => {
                this.previousScrapeStatus.mergeWith(scrapeStatus);
                logger.info('Finished scraping.');
                resolve();
            });

            artifactsSummaryObservable.subscribe(artifact => {
                logger.info('latestArtifacts: NEXT');
            }, err => {
                logger.error('latestArtifacts: ERROR: ' + err);
                reject(err);
            }, () => {
                logger.info('latestArtifacts: COMPLETE');
                resolve();
            });
        });
    }

    private collectMetrics(build: BuildInfo): void {
        logger.debug(`Collecting metrics for ${build.build_url} ${build.lifecycle}`);
        if (isFinished(build)) {
            const finishedBuild = build as FinishedBuildInfo;
            const labels: Metrics.Labels = this.buildMetricLabels(finishedBuild, build);

            if (build.build_time_millis) {
                Metrics.buildTimes.observe(labels, Math.round(build.build_time_millis / 1000));
            }
        }
    }

    private buildMetricLabels(finishedBuild: FinishedBuildInfo, build: BuildInfo): Metrics.Labels {
        const labels: Partial<Metrics.Labels> = {
            owner: finishedBuild.username,
            repo: finishedBuild.reponame,
            success: (isSuccess(finishedBuild)).toString(),
            branch: finishedBuild.branch,
        };

        const workflow: Workflow | null = getWorkflow(build.workflows);
        if (workflow != null) {
            labels.workflow_job = workflow.job_id;
            labels.workflow = workflow.workflow_id;
            if (workflow.upstream_job_ids != null && workflow.upstream_job_ids.length > 0) {
                labels.upstream_jobs = workflow.upstream_job_ids.join(',');
            } else {
                labels.upstream_jobs = uuidv4();
            }
        } else {
            labels.workflow_job = uuidv4();
            labels.workflow = uuidv4();
            labels.upstream_jobs = uuidv4();
        }

        return labels as Metrics.Labels;
    }
}
