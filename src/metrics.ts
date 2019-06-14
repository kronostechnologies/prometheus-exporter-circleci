import { Histogram } from 'prom-client';

// tslint:disable-next-line:interface-over-type-literal
export type Labels = {
    owner: string;
    repo: string;
    success: string;
    branch: string;
    workflow_job: string;
    workflow: string;
    upstream_jobs: string;
};

const buildTimes: Histogram = new Histogram({
    name: 'circleci_build_time',
    help: 'Build time in seconds',
    labelNames: ['owner', 'repo', 'success', 'branch', 'workflow', 'workflow_job', 'upstream_jobs'],
    buckets: [0, 60, 120, 180, 240, 300, 420, 540, 660, 780, 900, 1200],
});

export {
    buildTimes,
};
