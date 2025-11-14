const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const SALT_ROUNDS = Number.isInteger(Number(process.env.BCRYPT_SALT_ROUNDS))
  ? Number(process.env.BCRYPT_SALT_ROUNDS)
  : 12;
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_TTL_MS = Number.isFinite(Number(process.env.JWT_REFRESH_TTL_MS))
  ? Number(process.env.JWT_REFRESH_TTL_MS)
  : 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = Number.isFinite(Number(process.env.PASSWORD_RESET_TTL_MS))
  ? Number(process.env.PASSWORD_RESET_TTL_MS)
  : 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = Number.isFinite(Number(process.env.EMAIL_VERIFICATION_TTL_MS))
  ? Number(process.env.EMAIL_VERIFICATION_TTL_MS)
  : 24 * 60 * 60 * 1000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const REFRESH_TOKEN_BYTES = Number.isFinite(Number(process.env.REFRESH_TOKEN_BYTES))
  ? Number(process.env.REFRESH_TOKEN_BYTES)
  : 48;
const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || 'jabez@superadmin.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'lokeshen@58';
const PROMOTION_THRESHOLD = 60;
const DEFAULT_CURRICULUM = 'cbc';
const CURRICULUM_LEVELS = {
  cbc: [
    'PP1',
    'PP2',
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6',
    'Grade 7',
    'Grade 8',
    'Grade 9',
    'Grade 10',
    'Grade 11',
    'Grade 12'
  ],
  '844': [
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6',
    'Grade 7',
    'Grade 8',
    'Form 1',
    'Form 2',
    'Form 3',
    'Form 4'
  ],
  british: [
    'Year 1',
    'Year 2',
    'Year 3',
    'Year 4',
    'Year 5',
    'Year 6',
    'Year 7',
    'Year 8',
    'Year 9',
    'Year 10',
    'Year 11',
    'Year 12',
    'Year 13'
  ],
  american: [
    'Kindergarten',
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6',
    'Grade 7',
    'Grade 8',
    'Grade 9',
    'Grade 10',
    'Grade 11',
    'Grade 12'
  ],
  ib: [
    'PYP 1',
    'PYP 2',
    'PYP 3',
    'PYP 4',
    'PYP 5',
    'MYP 1',
    'MYP 2',
    'MYP 3',
    'MYP 4',
    'MYP 5',
    'DP 1',
    'DP 2'
  ]
};

module.exports = {
  JWT_SECRET,
  SALT_ROUNDS,
  JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  EMAIL_VERIFICATION_TTL_MS,
  FRONTEND_URL,
  REFRESH_TOKEN_BYTES,
  SUPER_ADMIN_USERNAME,
  SUPER_ADMIN_PASSWORD,
  PROMOTION_THRESHOLD,
  DEFAULT_CURRICULUM,
  CURRICULUM_LEVELS
};