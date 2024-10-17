import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
// import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'; // Commented out
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/metrics';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Configure exporters
const traceExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
});

// Commenting out the logExporter
// const logExporter = new OTLPLogExporter({
//   url: 'http://localhost:4318/v1/logs',
// });

const metricExporter = new OTLPMetricExporter({
  url: 'http://localhost:4318/v1/metrics',
});

// Initialize the OpenTelemetry SDK
const sdk = new NodeSDK({
  traceExporter,
  // logExporter, // Commented out
  instrumentations: [getNodeAutoInstrumentations()],
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'nodejs-app',
  }),
});

// Start the SDK
sdk.start();

// Set up the OpenTelemetry logger
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// Ensure the SDK is properly shut down on exit
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('SDK terminated'))
    .catch((error) => console.log('Error terminating SDK', error))
    .finally(() => process.exit(0));
});

// Create the MeterProvider
const meterProvider = new MeterProvider(); // Removed the metricReaders configuration

// Create a meter
const meter = meterProvider.getMeter('node-js');

// Create a counter for incoming requests
const requestCounter = meter.createCounter('http_requests_total', {
  description: 'Total number of incoming HTTP requests',
});

// Log when the application starts
diag.info(`[node-js] NestJS application started`);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Log when a request is received
  app.use((req, res, next) => {
    const start = Date.now();
    requestCounter.add(1); // Increment the counter for each incoming request

    res.on('finish', () => {
      const duration = Date.now() - start; // Calculate latency
      diag.info(`[node-js] Request handled in ${duration} ms`); // Log latency
    });

    next();
  });

  await app.listen(3000);
  diag.info(`[node-js] Application is listening on port 3000`);
}

// Start the application
bootstrap();
