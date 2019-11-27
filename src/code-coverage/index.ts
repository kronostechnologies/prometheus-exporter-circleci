import { basename } from 'path';
import { Stream } from 'stream';
import { CloverParser } from './clover-parser';
import { JacocoParser } from './jacoco-parser';

export interface CoverageInfo {
    classes: number; // clover: classes, jacoco: CLASS/missed+CLASS/covered
    covered_classes: number; // clover: sum files/metrics avec coveredelements > 0, jacoco:CLASS/covered
    methods: number; // clover:methods, jacoco: METHOD/covered+METHOD/missed
    covered_methods: number; // clover:coveredMethods, jacoco: METHOD/covered
    lines: number; // clover:statements, jacoco: LINE/covered+LINE/missed
    covered_lines: number; // clover:coveredStatements, jacoco: LINE/covered
}

export interface CodeCoverageParser {
    parseStream(stream: Stream): Promise<CoverageInfo>;
}

export function getCodeCoverageParserForArtifactPath(artifactPath: string): CodeCoverageParser | null {
    const fileName = basename(artifactPath);
    switch (fileName) {
        case 'js-test-coverage.xml':
        case 'php-test-coverage.xml':
            return new CloverParser();
        case 'unit-test-coverage.xml':
            return new JacocoParser();
    }

    return null;
}
