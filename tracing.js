const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http'); // Import metric exporter
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');

// Configure the OTLP trace exporter to send traces to Signoz
const traceExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
});

// Configure the OTLP log exporter to send logs to Signoz
const logExporter = new OTLPLogExporter({
  url: 'http://localhost:4318/v1/logs',
});

// Configure the OTLP metric exporter to send metrics to Signoz
const metricExporter = new OTLPMetricExporter({
  url: 'http://localhost:4318/v1/metrics',
});

// Initialize the OpenTelemetry SDK
const sdk = new NodeSDK({
  traceExporter,
  logExporter,
  metricExporter, // Add metric exporter
  instrumentations: [getNodeAutoInstrumentations()],
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'nodejs-app', // Replace with your desired service name
  }),
});

// Start the SDK
sdk.start();

console.log('Tracing, logging, and metrics initialized');

// Set up the OpenTelemetry logger
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// Ensure the SDK is properly shut down on exit
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('SDK terminated'))
    .catch((error) => console.log('Error terminating SDK', error))
    .finally(() => process.exit(0));
});
