// telemetry.js (ESM)
import appInsights from "applicationinsights";

const conn = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
          || process.env.APPINSIGHTS_CONNECTIONSTRING; // por compatibilidad

if (conn) {
  appInsights
    .setup(conn)
    .setSendLiveMetrics(true)        // Live Metrics en tiempo real
    .setAutoCollectRequests(true)    // solicitudes HTTP
    .setAutoCollectDependencies(true)// llamadas a Mongo/HTTP/etc.
    .setAutoCollectExceptions(true)  // excepciones no controladas
    .setAutoCollectPerformance(true, true)
    .setAutoCollectConsole(true, true) // console.log/console.error
    .start();

  // Nombre lógico en el mapa de aplicación
  const c = appInsights.defaultClient;
  c.context.tags[c.context.keys.cloudRole] = "doinow-backend";
  c.context.tags[c.context.keys.cloudRoleInstance] = process.env.HOSTNAME || "appservice";

  console.log("📡 Application Insights habilitado");
}

export const aiClient = appInsights.defaultClient;
