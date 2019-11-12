import * as fs from 'fs';
import XmlStream from 'xml-stream';

export interface CoverageInfo {
    classes: number; // clover: classes, jacoco: CLASS/missed+CLASS/covered
    covered_classes: number; // clover: sum files/metrics avec coveredelements > 0, jacoco:CLASS/covered
    methods: number; // clover:methods, jacoco: METHOD/covered+METHOD/missed
    covered_methods: number; // clover:coveredMethods, jacoco: METHOD/covered
    lines: number; // clover:statements, jacoco: LINE/covered+LINE/missed
    covered_lines: number; // clover:coveredStatements, jacoco: LINE/covered
}

export interface CodeCoverageParser {
    parseStream(stream: fs.ReadStream): Promise<CoverageInfo>;
}

export class CloverCodeCoverageParser implements CodeCoverageParser {

/*
    http://openclover.org/doc/manual/latest/general--about-openclover-code-metrics.html
    <metrics
    files="51"
    loc="9619" ncloc="8111"
    classes="36"
    methods="530" coveredmethods="34"
    conditionals="0" coveredconditionals="0"
    statements="4050" coveredstatements="243"
    elements="4580" coveredelements="277" -> statement + conditional
    />
*/
    parseStream(stream: fs.ReadStream): Promise<CoverageInfo> {
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

            xml.on('endElement: coverage > project > package > file > class > metrics', (metrics: any) => {
                this.assembleClassMetricsAttributes(coverageInfo, metrics.$);
            });
            xml.on('endElement: coverage > project > metrics', (metrics: any) => {
                this.assembleMetricsAttributes(coverageInfo, metrics.$);
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

    assembleClassMetricsAttributes(coverageInfo: CoverageInfo, metrics: any): void {
        if (parseInt(metrics.coveredelements, 10) > 0) {
            coverageInfo.covered_classes++;
        }
    }

    assembleMetricsAttributes(coverageInfo: CoverageInfo, metrics: any): void {
        coverageInfo.classes = parseInt(metrics.classes, 10);
        coverageInfo.methods = parseInt(metrics.methods, 10);
        coverageInfo.covered_methods = parseInt(metrics.coveredmethods, 10);
        coverageInfo.lines = parseInt(metrics.statements, 10);
        coverageInfo.covered_lines = parseInt(metrics.coveredstatements, 10);
    }
}

export class JacocoCodeCoverageParser implements CodeCoverageParser {
/*
https://www.jacoco.org/jacoco/trunk/doc/counters.html

<counter type="INSTRUCTION" missed="2778" covered="1771"/> (C0 Coverage)  single Java byte code instructions
  <counter type="BRANCH" missed="130" covered="118"/> (C1 Coverage) all if and switch statements
  <counter type="LINE" missed="415" covered="269"/>
  <counter type="COMPLEXITY" missed="328" covered="186"/>
  <counter type="METHOD" missed="252" covered="132"/>
  <counter type="CLASS" missed="49" covered="30"/>
*/
    parseStream(stream: fs.ReadStream): Promise<CoverageInfo> {
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
