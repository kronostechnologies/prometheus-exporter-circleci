import { Stream } from 'stream';
import XmlStream from 'xml-stream';
import { CodeCoverageParser, CoverageInfo } from './index';

export class CloverParser implements CodeCoverageParser {

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
