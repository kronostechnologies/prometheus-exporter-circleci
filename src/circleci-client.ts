import { Artifact, BuildSummary, CircleCI, RequestOptions } from 'circleci-api';
import request from 'request';
import { Observable, Subscriber } from 'rxjs';
import { filterBuilds } from './builds-filter';
import { CircleCiConfig } from './config';
import { CurrentScrapeStatus } from './current-scrape-status';
import logger from './logger';
import { PagingOptions } from './paging-options';
import { ScrapeStatus } from './scrape-status';

export type BuildInfo = BuildSummary & {
    username: string;
    reponame: string;
    lifecycle: string;
};

export type ArtifactInfo = Artifact & {
    username: string;
    reponame: string;
    lifecycle: string;
};

export type DefinedRequestOptions = Required<RequestOptions>;

const THROTTLING = 250;
const MAX_RETRIES = 3;

export class CircleCiClient {
    private readonly apiToken: string;
    private readonly api: CircleCI;
    private readonly organization: string;

    constructor(config: CircleCiConfig) {
        this.apiToken = config.token;
        this.organization = config.organization;
        this.api = new CircleCI({
            token: config.token,
            vcs: {
                owner: config.organization,
                repo: 'kronos-fna',
            },
        });
    }

    public getRecentBuilds(pagingOptions: PagingOptions, previousScrapeStatus: ScrapeStatus): Observable<BuildInfo> {
        return new Observable(subscriber => {
            this.doGetRecentBuilds(subscriber, pagingOptions, new CurrentScrapeStatus({
                lastScrapeTime: previousScrapeStatus.lastScrapeTime,
                finishedBuildUrl: previousScrapeStatus.lastFinishedBuildUrl,
                finishedBuildTime: previousScrapeStatus.lastFinishedBuildTime,
                queuedBuildUrl: previousScrapeStatus.lastQueuedOrRunningBuildUrl,
                queuedBuildTime: previousScrapeStatus.lastQueuedOrRunningBuildTime,
                reachedFinishedBuild: false,
                reachedQueuedBuild: false,
                reachedSinceTime: false,
                retry: 0,
            }));
        });
    }

    private doGetRecentBuilds(
        subscriber: Subscriber<BuildInfo>,
        pagingOptions: PagingOptions,
        status: CurrentScrapeStatus,
    ): void {
        const requestOptions: DefinedRequestOptions = {
            limit: pagingOptions.limit || 100,
            offset: pagingOptions.offset || 0,
        };

        this.api.recentBuilds(requestOptions)
            .then((builds: BuildSummary[]) => {
                try {
                    this.handleJobs(builds, pagingOptions, status, requestOptions, subscriber);
                } catch (err) {
                    subscriber.error(err);
                }
            })
            .catch(err => {
                logger.error(`Error fetching recent builds : ${err}. Retrying.`);
                if (status.retry < MAX_RETRIES) {
                    status.retry++;
                    setTimeout(() => this.doGetRecentBuilds(subscriber, pagingOptions, status),
                        1000 * status.retry);
                }
            });
    }

    public getBuildArtifacts(
        buildNumber: number,
    ): Observable<ArtifactInfo> {
        return new Observable(subscriber => {
            this.doGetBuildArtifacts(subscriber, buildNumber);
        });
    }

    private doGetBuildArtifacts(
        subscriber: Subscriber<ArtifactInfo>,
        buildNumber: number,
    ): void {
        this.api.artifacts(buildNumber)
            .then((artifacts: Artifact[]) => {
                try {
                    if (artifacts.length > 0) {
                        logger.info(`Found ${artifacts.length} artifacts for build #${buildNumber}`);
                        artifacts.forEach(artifact => {
                            const options = {
                                headers: {
                                    'circle-token': this.apiToken,
                                },
                            };

                            request(artifact.url, options, (err, response, body) => {
                                if (response.statusCode === 200) {
                                    logger.info(`Artifact ${response.request.path} has been retrieved`); // TODO: Use body to get artifact/xml content
                                }
                            });
                        });
                    }
                } catch (err) {
                    subscriber.error(err);
                }
            })
            .catch(err => {
                logger.error(`Error fetching artifacts on build #${buildNumber} : ${err}. Retrying.`);
                // if (files.retry < MAX_RETRIES) {
                //     files.retry++;
                //     setTimeout(() => this.doGetBuildArtifacts(subscriber, buildNumber),
                //         1000 * files.retry);
                // }
            });
    }

    private handleJobs(
        builds: BuildSummary[],
        pagingOptions: PagingOptions,
        status: CurrentScrapeStatus,
        requestOptions: DefinedRequestOptions,
        subscriber: Subscriber<BuildInfo>,
    ): void {
        const buildsToProcess = filterBuilds(this.organization, builds, status, pagingOptions.since);
        buildsToProcess.forEach(build => subscriber.next(build));
        logger.info(`Processed ${buildsToProcess.length} jobs`);

        const maxPages: number = pagingOptions.maxPages || Number.MAX_SAFE_INTEGER;
        if (this.hasReachedLastRequestedBuild(status, requestOptions, maxPages)) {
            subscriber.complete();
        } else {
            setTimeout(() => this.doGetRecentBuilds(subscriber, {
                ...pagingOptions,
                limit: requestOptions.limit,
                offset: requestOptions.offset + requestOptions.limit,
                maxPages,
            }, status), THROTTLING);
        }
    }

    private hasReachedLastRequestedBuild(
        status: CurrentScrapeStatus,
        requestOptions: DefinedRequestOptions,
        maxPages: number,
    ): boolean {
        return status.reachedSinceTime
            || status.reachedLastScrape()
            || this.isLastRequestedPage(requestOptions, maxPages);
    }

    private isLastRequestedPage(requestOptions: DefinedRequestOptions, maxPages: number): boolean {
        return requestOptions.offset / requestOptions.limit + 1 === maxPages;
    }
}
