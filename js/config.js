// ════════════════════════════════════════════
// js/config.js  ·  Variáveis de configuração
// ════════════════════════════════════════════
// ⚠️  Substitua pelos valores reais do seu projeto Supabase
// Acesse: https://app.supabase.com → Project Settings → API

const SUPABASE_URL    = 'https://duepsnvrcchrxxqxbnkx.supabase.co';
const SUPABASE_ANON   = 'sb_publishable_TvN3i4OX3o_r5VkDzrfuxw_BsROYZHT';

// WhatsApp via Callmebot (gratuito, sem backend)
// Cadastre em: https://www.callmebot.com/blog/free-api-whatsapp-messages/
const WA_CALLMEBOT_ENABLED = true;

// Página de aprovação/cancelamento (URL pública do seu site Vercel)
const APP_BASE_PATH = window.location.pathname.replace(/\/[^/]*$/, '');
const APP_URL = `${window.location.origin}${APP_BASE_PATH}`;
