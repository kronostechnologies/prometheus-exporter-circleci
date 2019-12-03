import * as fs from 'fs';
import * as path from 'path';
import { CloverParser } from '../../src/code-coverage/clover-parser';

test('CloverParser parseStream returns CoverageInfo with parsed data', async () => {

    const parser = new CloverParser();
    const stream = fs.createReadStream(path.join(__dirname, '../../examples/php-test-coverage.clover.xml'));
    const coverageInfo = await parser.parseStream(stream);

    expect(coverageInfo).toEqual({
        classes: 36,
        covered_classes: 1,
        covered_lines: 243,
        covered_methods: 34,
        lines: 4050,
        methods: 530,
    });
});
