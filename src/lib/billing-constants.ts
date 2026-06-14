// Constantes de billing — separadas del route para evitar conflicto con Next.js exports

export const PLANS = {
  FREE:       { label: 'Clásico',   monthly: 0,    annual: 0,    clients: 3,   users: 5,   ai: false },
  PRO:        { label: 'Pro',       monthly: 299,  annual: 2870, clients: 10,  users: 15,  ai: true  },
  BUSINESS:   { label: 'Business',  monthly: 549,  annual: 5270, clients: 999, users: 999, ai: true  },
  ENTERPRISE: { label: 'Enterprise',monthly: 0,    annual: 0,    clients: 999, users: 999, ai: true  },
} as const;

export const AI_TIERS = {
  basic:   { label: 'IA Básica',   monthly: 0,   models: ['gemini', 'llama'] },
  medium:  { label: 'IA Mediana',  monthly: 100, models: ['gemini', 'llama', 'deepseek'] },
  premium: { label: 'IA Premium',  monthly: 200, models: ['gemini', 'llama', 'deepseek', 'claude'] },
} as const;

export const EXTRA_CLIENTS_PRICE = 100; // MXN por cada bloque de 4 clientes

export type PlanKey = keyof typeof PLANS;
export type AiKey   = keyof typeof AI_TIERS;
