import * as fs from 'fs';
import * as path from 'path';
import { JacocoParser } from '../../src/code-coverage/jacoco-parser';

test('JacocoParser parseStream returns CoverageInfo with parsed data', async () => {

    const parser = new JacocoParser();
    const stream = fs.createReadStream(path.join(__dirname, '../../examples/kotlin-test-coverage.jacoco.xml'));
    const coverageInfo = await parser.parseStream(stream);

    expect(coverageInfo).toEqual({
        classes: 79,
        covered_classes: 30,
        covered_lines: 269,
        covered_methods: 132,
        lines: 684,
        methods: 384,
    });
});
