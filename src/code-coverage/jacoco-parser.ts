import { Stream } from 'stream';
import XmlStream from 'xml-stream';
import { CodeCoverageParser, CoverageInfo } from './index';

export class JacocoParser implements CodeCoverageParser {
    /*
    https://www.jacoco.org/jacoco/trunk/doc/counters.html

    <counter type="INSTRUCTION" missed="2778" covered="1771"/> (C0 Coverage)  single Java byte code instructions
      <counter type="BRANCH" missed="130" covered="118"/> (C1 Coverage) all if and switch statements
      <counter type="LINE" missed="415" covered="269"/>
      <counter type="COMPLEXITY" missed="328" covered="186"/>
      <counter type="METHOD" missed="252" covered="132"/>
      <counter type="CLASS" missed="49" covered="30"/>
    */
    async parseStream(stream: Stream): Promise<CoverageInfo> {
        let firstError: any;
        const coverageInfo: CoverageInfo = {
            classes: 0,
            covered_classes: 0,
            methods: 0,
            covered_methods: 0,
            lines: 0,
            covered_lines: 0,
        };
        return new Promise((resolve, reject) => {
            const xml = new XmlStream(stream, 'utf8');

            xml.on('endElement: report > counter', (counter: any) => {
                this.assembleCounter(coverageInfo, counter.$);
            });

            xml.on('error', (error: any) => {
                if (!firstError) {
                    firstError = error;
                }
            });

            xml.on('end', () => {
                if (firstError) {
                    reject(firstError);
                } else {
                    resolve(coverageInfo);
                }
            });
        });
    }

    assembleCounter(coverageInfo: CoverageInfo, counter: any): void {

        switch (counter.type) {
            case 'CLASS':
                coverageInfo.classes = parseInt(counter.covered, 10) + parseInt(counter.missed, 10);
                coverageInfo.covered_classes = parseInt(counter.covered, 10);
                break;
            case 'METHOD':
                coverageInfo.methods = parseInt(counter.covered, 10) + parseInt(counter.missed, 10);
                coverageInfo.covered_methods = parseInt(counter.covered, 10);
                break;
            case 'LINE':
                coverageInfo.lines = parseInt(counter.covered, 10) + parseInt(counter.missed, 10);
                coverageInfo.covered_lines = parseInt(counter.covered, 10);
                break;
        }
    }
}
