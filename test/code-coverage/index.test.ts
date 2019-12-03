import { getCodeCoverageParserForArtifactPath } from '../../src/code-coverage';
import { CloverParser } from '../../src/code-coverage/clover-parser';
import { JacocoParser } from '../../src/code-coverage/jacoco-parser';

describe('getCodeCoverageParserForArtifactPath', () => {
    const CLOVER_FILE_NAME = 'lang-test-coverage.clover.xml';
    const JACOCO_FILE_NAME = 'lang-test-coverage.jacoco.xml';

    test('Filename with clover extension returns CloverParser',  () => {
        const parser = getCodeCoverageParserForArtifactPath(CLOVER_FILE_NAME);

        expect(parser).toBeInstanceOf(CloverParser);
    });

    test('Filename with clover extension returns CloverParser',  () => {
        const parser = getCodeCoverageParserForArtifactPath(JACOCO_FILE_NAME);

        expect(parser).toBeInstanceOf(JacocoParser);
    });
});
