import '@testing-library/jest-dom';
import { setupIntegrationEnv } from '../../tests/integration/helper';

const isIntegrationRun =
  process.env.VITEST_INTEGRATION === '1' ||
  process.argv.some((arg) => arg.includes('tests/integration'));

if (isIntegrationRun) {
  setupIntegrationEnv();
}
