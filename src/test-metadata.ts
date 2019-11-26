import { TestMetadata, TestMetadataResponse } from 'circleci-api';

export interface TestMetadataInfo {
    success: number;
    failure: number;
    run_time: number;
}

export class TestMetadataAggregator {
    metadataInfo: TestMetadataInfo;

    constructor() {
        this.metadataInfo = {
            success: 0,
            failure: 0,
            run_time: 0,
        };
    }

    loadTestMetadataResponse(response: TestMetadataResponse): void {
        response.tests.forEach(testMetadata => this.loadTestMetadata(testMetadata));
    }

    loadTestMetadata(testMetadata: TestMetadata): void {
        if (testMetadata.result === 'success') {
            this.metadataInfo.success++;
        } else {
            this.metadataInfo.failure++;
        }
        this.metadataInfo.run_time += (testMetadata.run_time || 0);
    }
}
