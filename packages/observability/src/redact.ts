// Caminhos sensíveis que o pino deve redact em todos os logs.
//
// ESTA LISTA É O PISO, NÃO O TETO. Ela cobre o que é sensível em QUALQUER
// projeto (credencial, segredo, cartão) + PII comum de sistema BR. Ela NÃO
// conhece o domínio do seu projeto — e é aí que o vazamento acontece: um
// produto de RH que loga `salario`/`holerite`, um de saúde que loga `cid`, um
// financeiro que loga `saldo`. Ao modelar uma entidade com campo sensível,
// ADICIONE o path aqui na mesma task. Redact que só conhece senha e cartão dá
// falsa sensação de cobertura num produto cheio de PII.
export const REDACT_PATHS = [
  // headers
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'req.headers["x-api-key"]',
  'req.headers["x-webhook-signature"]',

  // bodies — auth
  '*.password',
  '*.passwordConfirmation',
  '*.currentPassword',
  '*.newPassword',
  '*.token',
  '*.refreshToken',
  '*.accessToken',
  '*.sessionToken',

  // bodies — secrets
  '*.secret',
  '*.apiKey',
  '*.privateKey',
  '*.clientSecret',
  '*.webhookSecret',

  // payment
  '*.cardNumber',
  '*.cvv',
  '*.cvc',

  // PII comum em sistema BR — documento e dado bancário nunca vão pro log.
  // Estenda com o PII do SEU domínio (ex: salario, holerite, cid, saldo).
  '*.cpf',
  '*.cnpj',
  '*.rg',
  '*.pix',
  '*.pixKey',
  '*.agencia',
  '*.conta',
  '*.contaBancaria',
] as const
