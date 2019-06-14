import { BuildSummary } from 'circleci-api';
import { filterBuilds } from '../src/builds-filter';
import { BuildInfo } from '../src/circleci-client';
import { CurrentScrapeStatus } from '../src/current-scrape-status';

const A_USERNAME = 'a username';
const ANOTHER_USERNAME = 'another username';

beforeEach(() => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => now);
});

afterEach(() => {
    (Date.now as any as jest.SpyInstance<number, []>).mockRestore();
});

function dateAsString(time: number): string {
    return new Date(time).toISOString();
}

test('filtered builds should only contain builds from username\'s projects', () => {
    const buildFromUser = { username: A_USERNAME };
    const buildFromAnotherUser = { username: ANOTHER_USERNAME };
    const builds = [buildFromAnotherUser, buildFromUser];

    const filteredBuilds: BuildInfo[] = filterBuilds(A_USERNAME, builds, new CurrentScrapeStatus());

    expect(filteredBuilds).toHaveLength(1);
    expect(filteredBuilds).toContainEqual(buildFromUser);
});

test('filtered builds should only contain builds before time limit', () => {
    const now = Date.now();
    const since = 10_000;
    const buildsSinceTime: BuildSummary[] = [
        { username: A_USERNAME, stop_time: dateAsString(now - since + 1) },
        { username: A_USERNAME, stop_time: dateAsString(now - since) },
    ];
    const buildsPastTime: BuildSummary[] = [
        { username: A_USERNAME, stop_time: dateAsString(now - since - 1) },
    ];
    const builds: BuildSummary[] = [...buildsSinceTime, ...buildsPastTime];
    const status = new CurrentScrapeStatus({ reachedSinceTime: false });

    const filteredBuilds: BuildInfo[] = filterBuilds(A_USERNAME, builds, status, since);

    expect(status.reachedSinceTime).toBe(true);
    expect(filteredBuilds).toHaveLength(2);
    expect(filteredBuilds).toEqual(buildsSinceTime);
});

test('filtered builds should contain builds before last seen finished build', () => {
    const buildsBeforeLastFinished: BuildSummary[] = [
        { username: A_USERNAME, lifecycle: 'finished', build_url: 'a' },
        { username: A_USERNAME, lifecycle: 'finished', build_url: 'b' },
    ];
    const buildsAfterLastFinished: BuildSummary[] = [
        { username: A_USERNAME, lifecycle: 'finished', build_url: 'c' },
        { username: A_USERNAME, lifecycle: 'finished', build_url: 'd' },
    ];
    const builds: BuildSummary[] = [...buildsBeforeLastFinished, ...buildsAfterLastFinished];
    const status = new CurrentScrapeStatus({
        finishedBuildUrl: 'c',
        reachedFinishedBuild: false,
    });

    const filteredBuilds: BuildInfo[] = filterBuilds(A_USERNAME, builds, status);

    expect(status.reachedFinishedBuild).toBe(true);
    expect(filteredBuilds).toHaveLength(2);
    expect(filteredBuilds).toEqual(buildsBeforeLastFinished);
});

test('filtered builds should contain builds finished since last scrape', () => {
    const lastScrapeTime = Date.now();
    /**
     * Assuming last scrape was
     * [finished, a]
     * [finished, b]
     * [queued/running, c]
     * [queued/running, d]
     */
    const builds: BuildSummary[] = [
        { username: A_USERNAME, lifecycle: 'finished', build_url: 'a', stop_time: dateAsString(lastScrapeTime) },
        { username: A_USERNAME, lifecycle: 'finished', build_url: 'b', stop_time: dateAsString(lastScrapeTime - 1) },
        { username: A_USERNAME, lifecycle: 'finished', build_url: 'c', stop_time: dateAsString(lastScrapeTime + 1) },
        { username: A_USERNAME, lifecycle: 'finished', build_url: 'd', stop_time: dateAsString(lastScrapeTime + 1) },
    ];
    const status = new CurrentScrapeStatus({
        finishedBuildUrl: 'a',
        queuedBuildUrl: 'd',
        reachedFinishedBuild: false,
        reachedQueuedBuild: false,
        lastScrapeTime,
    });

    const filteredBuilds: BuildInfo[] = filterBuilds(A_USERNAME, builds, status);

    expect(status.reachedFinishedBuild).toBe(true);
    expect(status.reachedQueuedBuild).toBe(true);
    expect(filteredBuilds).toHaveLength(2);
    expect(filteredBuilds[0]).toMatchObject({ build_url: 'c' });
    expect(filteredBuilds[1]).toMatchObject({ build_url: 'd' });
});
