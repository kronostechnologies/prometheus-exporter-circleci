import { BuildSummary } from 'circleci-api';
import { BuildInfo } from './circleci-client';
import { CurrentScrapeStatus } from './current-scrape-status';
import { isBuildOlderThan, isFinished } from './utils';

export function filterBuilds(
    username: string,
    builds: BuildSummary[],
    status: CurrentScrapeStatus,
    since?: number,
): BuildInfo[] {
    const buildsToProcess: BuildInfo[] = [];
    builds.filter(build => build.username === username)
        .forEach(build => {
            if (!status.reachedSinceTime) {
                if (isBuildOlderThan(build, since)) {
                    status.reachedSinceTime = true;
                } else if (!status.reachedFinishedBuild && status.isSameFinishedBuildUrl(build)) {
                    status.reachedFinishedBuild = true;
                } else if (!status.reachedQueuedBuild && status.isSameQueuedBuildUrl(build)) {
                    status.reachedQueuedBuild = true;
                    buildsToProcess.push(<BuildInfo>build);
                } else if (status.isFinishedSinceLastScrape(build)
                    || !isFinished(build) && !status.reachedLastQueuedBuild()
                    || !status.reachedFinishedBuild
                ) {
                    buildsToProcess.push(<BuildInfo>build);
                }
            }
        });
    return buildsToProcess;
}
