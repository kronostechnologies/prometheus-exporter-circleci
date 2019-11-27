import * as fs from 'fs';
import * as path from 'path';
import { CloverCodeCoverageParser, JacocoCodeCoverageParser } from '../src/code-coverage/code-coverage';

test('CloverParser parseStream returns CoverageInfo with parsed data', async () => {

    const parser = new CloverCodeCoverageParser();
    const stream = fs.createReadStream(path.join(__dirname, '../examples/php-test-coverage.xml'));
    const coverageInfo = await parser.parseStream(stream);

    expect(coverageInfo).toEqual({
        classes: 36,
        covered_classes: 22,
        covered_lines: 243,
        covered_methods: 34,
        lines: 4050,
        methods: 530,
    });
});

test('JacocoParser parseStream returns CoverageInfo with parsed data', async () => {

    const parser = new JacocoCodeCoverageParser();
    const stream = fs.createReadStream(path.join(__dirname, '../examples/unit-test-coverage.xml'));
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
