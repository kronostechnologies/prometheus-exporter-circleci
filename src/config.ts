export interface CircleCiConfig {
    organization: string;
    token: string;
}

export interface Config {
    circleci: CircleCiConfig;
    log: {
        level: string;
        format: string;
    };
    http: {
        port: number;
    };
    scrape: {
        buildsPerPage?: number;
        maxPages?: number;
        since?: number;
    };
}

function isNotDefined(value: string | null | undefined): boolean {
    return value === undefined || value === null || value.length === 0;
}

function validateConfig(): void {
    const errors = [];
    if (isNotDefined(process.env.CIRCLECI_ORGANIZATION)) {
        errors.push('CIRCLECI_ORGANIZATION is not defined.');
    }
    if (isNotDefined(process.env.CIRCLECI_TOKEN)) {
        errors.push('CIRCLECI_TOKEN is not defined.');
    }

    if (errors.length > 0) {
        errors.unshift('Invalid configuration :');
        throw new Error(errors.join('\n'));
    }
}

validateConfig();

const ONE_DAY_MS = 86_400_000;
const appConfig: Config = {
    circleci: {
        organization: process.env.CIRCLECI_ORGANIZATION as string,
        token: process.env.CIRCLECI_TOKEN as string,
    },
    log: {
        level: process.env.LOG_LEVEL || 'debug',
        format: process.env.LOG_FORMAT || 'json',
    },
    http: {
        port: Number(process.env.HTTP_PORT) || 9600,
    },
    scrape: {
        buildsPerPage: Number(process.env.SCRAPE_BUILDS_PER_PAGE) || 100,
        maxPages: Number(process.env.SCRAPE_MAX_PAGES),
        since: Number(process.env.SCRAPE_SINCE) || ONE_DAY_MS,
    },
};

// tslint:disable-next-line:no-default-export
export default appConfig;
