import { defineRailway, github, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const invoiceflowVolume = volume("invoiceflow-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-east4-eqdc4a", sizeMB: 5000 });
  const invoiceflow = service("invoiceflow", {
    source: github("freshwaterbruce2/vibe-tech-monorepo", { checkSuites: false }),
    replicas: { "us-east4-eqdc4a": 1 },
    domains: [{ domain: "invoiceflow.vibe-tech.org", port: 8787 }],
    volumeMounts: { "/data": invoiceflowVolume },
    env: { AUTH_SECRET: preserve(), DATABASE_PATH: preserve(), HOST: preserve(), INVOICE_SAAS_DEFAULT_PLAN: preserve(), NODE_ENV: preserve(), PORT: preserve(), SERVE_WEB: preserve(), WEB_DIST_DIR: preserve() },
  });

  return project("invoiceflow", {
    resources: [invoiceflow, invoiceflowVolume],
  });
});
