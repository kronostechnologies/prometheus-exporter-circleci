import { BuildSummary, Workflow } from 'circleci-api';

export function isSuccess(build: BuildSummary): boolean {
    return build.outcome === 'success';
}

export function isFinished(build: BuildSummary): boolean {
    return build.lifecycle === 'finished';
}

export function isFinishedOrSkipped(build: BuildSummary): boolean {
    return ['finished', 'not_run'].includes(build.lifecycle as string);
}

export function isBuildOlderThan(build: BuildSummary, since?: number): boolean {
    const buildTime = build.stop_time || build.start_time || build.queued_at;
    return buildTime != null && since != null && Date.now() - getTimeFromTimestamp(buildTime) > since;
}

export function getWorkflow(workflows: Workflow[] | undefined): Workflow | null {
    let workflow = null;
    if (workflows) {
        if (Array.isArray(workflows) && workflows.length > 0) {
            workflow = workflows[0];
        } else if (!Array.isArray(workflows)) {
            workflow = workflows as Workflow;
        }
    }
    return workflow;
}

export function getTimeFromTimestamp(timestamp: string): number {
    return new Date(timestamp).getTime();
}
