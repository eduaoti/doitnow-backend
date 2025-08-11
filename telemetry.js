// lib/telemetry.js
const appInsights = require('applicationinsights');

const conn = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
          || process.env.APPINSIGHTS_CONNECTIONSTRING;

let client = null;

if (conn) {
  appInsights
    .setup(conn)
    .setSendLiveMetrics(true)
    .setAutoCollectRequests(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectConsole(true, true)
    .start();

  client = appInsights.defaultClient;
  const keys = client.context.keys;
  client.context.tags[keys.cloudRole] = 'doinow-backend';
  client.context.tags[keys.cloudRoleInstance] =
    process.env.WEBSITE_INSTANCE_ID || process.env.HOSTNAME || 'local';

  console.log('📡 Application Insights habilitado');
} else {
  console.log('ℹ️ AI no configurado (falta APPLICATIONINSIGHTS_CONNECTION_STRING)');
}

module.exports = {
  ai: client,
  track: (name, props = {}) => client?.trackEvent({ name, properties: props }),
  trace: (message, props = {}, severity = 1) =>
    client?.trackTrace({ message, severity }, props),
  exception: (err, props = {}) =>
    client?.trackException({ exception: err, properties: props }),
  metric: (name, value, props = {}) =>
    client?.trackMetric({ name, value }, props),
};
