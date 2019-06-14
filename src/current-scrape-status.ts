import { BuildSummary } from 'circleci-api';
import { getTimeFromTimestamp, isFinished } from './utils';

export class CurrentScrapeStatus {
    lastScrapeTime?: number;
    finishedBuildUrl?: string;
    finishedBuildTime?: number;
    queuedBuildUrl?: string;
    queuedBuildTime?: number;
    reachedFinishedBuild: boolean;
    reachedQueuedBuild: boolean;
    reachedSinceTime: boolean;
    retry: number;

    constructor(values: Partial<CurrentScrapeStatus> | undefined = {}) {
        this.lastScrapeTime = values.lastScrapeTime;
        this.finishedBuildUrl = values.finishedBuildUrl;
        this.finishedBuildTime = values.finishedBuildTime;
        this.queuedBuildUrl = values.queuedBuildUrl;
        this.queuedBuildTime = values.queuedBuildTime;
        this.reachedFinishedBuild = values.reachedFinishedBuild || false;
        this.reachedQueuedBuild = values.reachedQueuedBuild || false;
        this.reachedSinceTime = values.reachedSinceTime || false;
        this.retry = values.retry || 0;
    }

    reachedLastScrape(): boolean {
        return this.reachedFinishedBuild && this.reachedLastQueuedBuild();
    }

    reachedLastQueuedBuild(): boolean {
        return this.reachedQueuedBuild || this.queuedBuildUrl == null;
    }

    isFinishedSinceLastScrape(build: BuildSummary): boolean {
        return isFinished(build)
            && this.reachedFinishedBuild
            && !this.reachedLastQueuedBuild()
            && this.isBuildFinishedAfterLastScrape(build, this.lastScrapeTime);
    }

    isSameFinishedBuildUrl(build: BuildSummary): boolean {
        return this.finishedBuildUrl != null
            && build.build_url != null
            && build.build_url === this.finishedBuildUrl;
    }

    isSameQueuedBuildUrl(build: BuildSummary): boolean {
        return this.queuedBuildUrl != null
            && build.build_url != null
            && build.build_url === this.queuedBuildUrl;
    }

    private isBuildFinishedAfterLastScrape(build: BuildSummary, lastScrapeTime: number | undefined): boolean {
        const buildTime = getTimeFromTimestamp(build.stop_time as string);
        return lastScrapeTime == null || buildTime > lastScrapeTime;
    }
}
