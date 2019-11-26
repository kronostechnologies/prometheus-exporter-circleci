import { Artifact, BuildSummary, CircleCI, RequestOptions } from 'circleci-api';
import request, { Response } from 'request';
import { from, Observable, Subscriber } from 'rxjs';
import { map, mergeAll } from 'rxjs/operators';
import { filterBuilds } from './builds-filter';
import {
    CodeCoverageParser,
    CoverageInfo,
    getCodeCoverageParserForArtifactPath,
} from './code-coverage';
import { CircleCiConfig } from './config';
import { CurrentScrapeStatus } from './current-scrape-status';
import logger from './logger';
import { PagingOptions } from './paging-options';
import { ScrapeStatus } from './scrape-status';

export type BuildInfo = BuildSummary & {
    username: string;
    reponame: string;
    lifecycle: string;
    vcs_tag?: string;
};

export type ArtifactInfo = Artifact & {
    coverage?: CoverageInfo;
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
                // Be carefull, every repo-based request to the api must override the repo in option argument.
                repo: 'override-me',
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
        repo: string,
    ): Observable<ArtifactInfo> {
        return new Observable(subscriber => {
            this.doGetBuildArtifacts(subscriber, buildNumber, repo);
        });
    }

    private doGetBuildArtifacts(
        subscriber: Subscriber<ArtifactInfo>,
        buildNumber: number,
        repo: string,
    ): void {
        this.api.artifacts(buildNumber, {
            vcs: {
                repo: repo,
            },
        })
            .then((artifacts: Artifact[]) => {
                from(artifacts)
                    .pipe(
                        map(artifact => this.fetchArtifactInfo(artifact)),
                        mergeAll(),
                    )
                    .subscribe(subscriber);
            })
            .catch(err => {
                if (err && err.response && err.response.status === 404) {
                    // No artifacts
                    subscriber.complete();
                    return;
                }
                logger.error(`Error fetching artifacts on build #${buildNumber} : ${err}.`);
                subscriber.complete();
            });
    }

    private async fetchArtifactInfo(artifact: Artifact): Promise<ArtifactInfo> {
        const parser = getCodeCoverageParserForArtifactPath(artifact.pretty_path || '');
        let coverage;
        if (parser !== null) {
            coverage = await this.fetchArtifactCoverageInfo(artifact, parser);
        }
        return {
            ...artifact,
            coverage,
        };
    }

    private async fetchArtifactCoverageInfo(artifact: Artifact, parser: CodeCoverageParser): Promise<CoverageInfo> {
        const options = {
            method: 'GET',
            uri: artifact.url,
            headers: {
                'circle-token': this.apiToken,
            },
            resolveWithFullResponse: true,
        };

        return new Promise((resolve, reject) => {
            request.get(artifact.url, options)
                .on('response', async (response: Response) =>  {
                    if (response.statusCode === 200) {
                        const coverageInfo: CoverageInfo = await parser.parseStream(response.request);
                        resolve(coverageInfo);
                    }
                })
                .on('error', reject);
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
