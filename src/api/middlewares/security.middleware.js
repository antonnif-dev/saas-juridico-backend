import helmet from "helmet";
import cors from "cors";

export function applySecurity(app) {
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.use(helmet());

  const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);

        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error("CORS: origin não permitida"), false);
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );
}