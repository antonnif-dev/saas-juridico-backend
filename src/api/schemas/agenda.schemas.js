/*
import { z } from "zod";

export const agendaCreateSchema = z.object({
  titulo: z.string().min(2).max(120),
  dataHora: z.string().datetime(),
  tipo: z.enum(["audiencia", "reuniao", "prazo", "outro"]).or(z.string().min(2).max(30)),
  processoId: z.string().nullable().optional(),
});

export const agendaUpdateSchema = agendaCreateSchema.extend({
});
*/