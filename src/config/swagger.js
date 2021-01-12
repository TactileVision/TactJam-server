import path from "path";

export const swaggerOptions = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "TactJam API Server",
      description:
        "Server to store and manage tactons for the TactJam GUI client",
      contact: {
        name: "Christopher Praas",
        email: "dev@schnitzel.app",
      },
      license: {
        name: "MIT",
        url: "https://github.com/TactileVision/TactJam-server",
      },
      version: "0.0.1",
    },
    servers: [
      {
        url: "http://localhost:8080/",
        description: "Development server",
      },
    ],
  },
  apis: [path.join(process.env.APP_PATH, "/src/routes/*.js")],
  routePrefix: "/docs",
  swaggerOptions: {
    url: "/swagger",
  },

  hideTopbar: true,
};

export default swaggerOptions;
