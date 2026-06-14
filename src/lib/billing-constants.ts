// Constantes de billing — separadas del route para evitar conflicto con Next.js exports

export const PLANS = {
  FREE:       { label: 'Clásico',   monthly: 350,  annual: 3360, clients: 5,   users: 999, ai: false },
  PRO:        { label: 'Pro',       monthly: 450,  annual: 4320, clients: 12,  users: 999, ai: true  },
  BUSINESS:   { label: 'Business',  monthly: 550,  annual: 5280, clients: 999, users: 999, ai: true  },
  ENTERPRISE: { label: 'Enterprise',monthly: 1500, annual: 14400,clients: 999, users: 999, ai: true  },
} as const;

// Nota: el plan FREE aquí representa "Clásico" — el trial de 15 días da acceso ilimitado
// El cobro inicia el día 15 automáticamente según el plan seleccionado

export const AI_TIERS = {
  basic:   { label: 'IA Básica',   monthly: 0,   models: ['gemini', 'llama'] },
  medium:  { label: 'IA Mediana',  monthly: 100, models: ['gemini', 'llama', 'deepseek'] },
  premium: { label: 'IA Premium',  monthly: 200, models: ['gemini', 'llama', 'deepseek', 'claude'] },
} as const;

export const EXTRA_CLIENTS_PRICE = 100; // MXN por cada bloque de 4 clientes

export type PlanKey = keyof typeof PLANS;
export type AiKey   = keyof typeof AI_TIERS;
