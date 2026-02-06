import rateLimit from "express-rate-limit";

export const rlGeneral = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

export const rlAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // login/refresh/rotas auth
  standardHeaders: true,
  legacyHeaders: false,
});

export const rlPublicForm = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // preatendimento público
  standardHeaders: true,
  legacyHeaders: false,
});

export const rlIA = rateLimit({
  windowMs: 60 * 1000,
  max: 15, // IA é custo: limite mais baixo
  standardHeaders: true,
  legacyHeaders: false,
});