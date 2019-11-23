import { Workflow } from 'circleci-api';
import { map, mergeAll, tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { ArtifactInfo, BuildInfo, CircleCiClient } from './circleci-client';
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

    public export(pagingOptions: PagingOptions): Promise<void> {
        const scrapeStatus = new ScrapeStatus();
        return this.client.getRecentBuilds(pagingOptions, this.previousScrapeStatus).pipe(
            tap(build => {
                scrapeStatus.updateFromBuild(build);
                this.collectMetrics(build);
            }),
            map(build => {
                return this.client.getBuildArtifacts(build.build_num || 0, build.reponame)
                    .pipe(map(artifact => {
                        return { build, artifact };
                    }));
            }),
            mergeAll(),
            tap(result => {
                const { build, artifact } = result;
                this.collectArtifactMetrics(build, artifact);
            }),
        )
            .toPromise()
            .then(() => {
                this.previousScrapeStatus.mergeWith(scrapeStatus);
                logger.info('Finished scraping.');
            })
            .catch(err => {
                logger.error(`Error scraping : ${err}`);
                throw err;
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
            branch: finishedBuild.branch || finishedBuild.vcs_tag || '',
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

    private collectArtifactMetrics(build: BuildInfo, artifact: ArtifactInfo): void {
        logger.debug(`Collecting metrics for artifact ${build.build_url} ${artifact.path}`);
        if (artifact.coverage) {
            const labels: Metrics.ArtifactLabels = {
                owner: build.username,
                repo: build.reponame,
                branch: build.branch || build.vcs_tag || '',
            };

            Metrics.codeCoverageLines.set(labels, artifact.coverage.covered_lines / artifact.coverage.lines);
            Metrics.codeCoverageMethods.set(labels, artifact.coverage.covered_methods / artifact.coverage.methods);
            Metrics.codeCoverageClasses.set(labels, artifact.coverage.covered_classes / artifact.coverage.classes);
        }
    }
}
