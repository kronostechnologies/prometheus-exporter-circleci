import { BuildInfo } from './circleci-client';
import { getTimeFromTimestamp, isFinished, isFinishedOrSkipped } from './utils';

export class ScrapeStatus {
    lastFinishedBuildTime?: number;
    lastFinishedBuildUrl?: string;
    lastQueuedOrRunningBuildTime?: number;
    lastQueuedOrRunningBuildUrl?: string;
    lastScrapeTime?: number;

    mergeWith(scrapeStatus: ScrapeStatus): void {
        if (scrapeStatus.lastFinishedBuildUrl) {
            this.lastFinishedBuildUrl = scrapeStatus.lastFinishedBuildUrl;
        }
        if (scrapeStatus.lastFinishedBuildTime) {
            this.lastFinishedBuildTime = scrapeStatus.lastFinishedBuildTime;
        }
        if (scrapeStatus.lastScrapeTime) {
            this.lastScrapeTime = scrapeStatus.lastScrapeTime;
        }
        this.lastQueuedOrRunningBuildUrl = scrapeStatus.lastQueuedOrRunningBuildUrl;
        this.lastQueuedOrRunningBuildTime = scrapeStatus.lastQueuedOrRunningBuildTime;
    }

    updateFromBuild(build: BuildInfo): void {
        if (!this.lastFinishedBuildUrl && isFinished(build)) {
            this.lastFinishedBuildTime = getTimeFromTimestamp(build.stop_time as string);
            this.lastFinishedBuildUrl = build.build_url;
        } else if (!isFinishedOrSkipped(build)) {
            const buildTime = build.stop_time || build.start_time || build.queued_at;
            this.lastQueuedOrRunningBuildTime = getTimeFromTimestamp(buildTime as string);
            this.lastQueuedOrRunningBuildUrl = build.build_url;
        }
    }
}
