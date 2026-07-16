import { Express } from "express";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger-spec.json";

export const setupSwagger = (app: Express): void => {
  const CSS_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css";
  const JS_URLS = [
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js",
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js"
  ];

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customCssUrl: CSS_URL,
      customJs: JS_URLS,
      customSiteTitle: "StudentOS API Documentation"
    })
  );
};
