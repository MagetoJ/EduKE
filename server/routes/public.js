const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const {
  SALT_ROUNDS,
  JWT_SECRET,
  JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  EMAIL_VERIFICATION_TTL_MS,
  FRONTEND_URL,
  REFRESH_TOKEN_BYTES
} = require('../config');
const {
  addMilliseconds,
  nowIso,
  generateRandomToken,
  hashToken
} = require('../utils');
const { dbRun, dbGet } = require('../database');

const router = express.Router();

const ensureTrialSubscriptionForSchool = async (schoolId) => {
  if (!schoolId) {
    return;
  }
  const existing = await dbGet('SELECT id FROM subscriptions WHERE school_id = ? LIMIT 1', [schoolId]);
  if (existing) {
    return;
  }
  const plan = await dbGet(
    'SELECT id, trial_duration_days FROM subscription_plans WHERE slug = ? LIMIT 1',
    ['trial']
  );
  if (!plan) {
    return;
  }
  const startDate = nowIso();
  const trialEnds =
    typeof plan.trial_duration_days === 'number'
      ? new Date(Date.now() + plan.trial_duration_days * 86400000).toISOString()
      : null;
  await dbRun(
    `INSERT INTO subscriptions (school_id, plan_id, status, start_date, trial_ends_at)
     VALUES (?, ?, ?, ?, ?)`,
    [schoolId, plan.id, 'active', startDate, trialEnds]
  );
};

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please try again later.'
});

const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many registration attempts. Please try again later.'
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register-school', registerRateLimiter, async (req, res) => {
  try {
    const { schoolName, curriculum, adminName, email, password } = req.body;

    if (!schoolName || !curriculum || !adminName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const schoolResult = await dbRun(
      'INSERT INTO schools (name, curriculum, level, principal) VALUES (?, ?, ?, ?)',
      [schoolName, curriculum, curriculum, adminName]
    );
    const schoolId = schoolResult.lastID;

    await ensureTrialSubscriptionForSchool(schoolId);

    const userResult = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, school_id) VALUES (?, ?, ?, ?, ?)',
      [adminName, normalizedEmail, passwordHash, 'admin', schoolId]
    );
    const userId = userResult.lastID;

    const verificationToken = generateRandomToken();
    const verificationHash = hashToken(verificationToken);
    const verificationExpiresAt = addMilliseconds(EMAIL_VERIFICATION_TTL_MS);

    await dbRun(
      'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, verificationHash, verificationExpiresAt]
    );

    console.log(
      `Email verification link for ${normalizedEmail}: ${FRONTEND_URL}/verify-email?token=${verificationToken}`
    );

    res.status(201).json({
      message: 'Registration successful. Please verify your email address to activate your account.'
    });
  } catch (error) {
    console.error('School registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await dbGet('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.role !== 'super_admin' && Number(user.is_verified) !== 1) {
      return res.status(403).json({ error: 'Email address has not been verified yet.' });
    }

    await dbRun('DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at <= ?', [user.id, nowIso()]);

    const refreshTokenValue = generateRandomToken(REFRESH_TOKEN_BYTES);
    const refreshTokenHash = hashToken(refreshTokenValue);
    const refreshTokenExpiresAt = addMilliseconds(JWT_REFRESH_TTL_MS);

    await dbRun(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshTokenHash, refreshTokenExpiresAt]
    );

    let school = null;
    if (user.role !== 'super_admin' && user.school_id) {
      school = await dbGet('SELECT name, curriculum FROM schools WHERE id = ?', [user.school_id]);
    }

    const accessPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.school_id
    };

    const token = jwt.sign(accessPayload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES_IN });

    res.json({
      token,
      refreshToken: refreshTokenValue,
      expiresIn: JWT_ACCESS_EXPIRES_IN,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.school_id,
        schoolName: school?.name,
        schoolCurriculum: school?.curriculum,
        emailVerified: Number(user.is_verified) === 1,
        emailVerifiedAt: user.email_verified_at,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

router.post('/forgot-password', authRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await dbGet('SELECT id, email FROM users WHERE email = ?', [normalizedEmail]);

    if (!user) {
      return res.json({ message: 'If the email exists, reset instructions have been sent.' });
    }

    await dbRun('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id]);

    const resetToken = generateRandomToken();
    const resetHash = hashToken(resetToken);
    const resetExpiresAt = addMilliseconds(PASSWORD_RESET_TTL_MS);

    await dbRun(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, resetHash, resetExpiresAt]
    );

    console.log(
      `Password reset link for ${normalizedEmail}: ${FRONTEND_URL}/reset-password?token=${resetToken}`
    );

    res.json({ message: 'If the email exists, reset instructions have been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Unable to process password reset request.' });
  }
});

router.post('/reset-password', authRateLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const resetHash = hashToken(token);
    const resetRecord = await dbGet(
      'SELECT * FROM password_reset_tokens WHERE token_hash = ?',
      [resetHash]
    );

    if (
      !resetRecord ||
      Number(resetRecord.used) === 1 ||
      new Date(resetRecord.expires_at).getTime() < Date.now()
    ) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, resetRecord.user_id]);
    await dbRun('UPDATE password_reset_tokens SET used = 1, used_at = ? WHERE id = ?', [nowIso(), resetRecord.id]);
    await dbRun('UPDATE refresh_tokens SET revoked = 1, revoked_at = ? WHERE user_id = ?', [nowIso(), resetRecord.user_id]);

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Unable to reset password.' });
  }
});

router.post('/verify-email', authRateLimiter, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const verificationHash = hashToken(token.trim());
    const verificationRecord = await dbGet(
      'SELECT * FROM email_verification_tokens WHERE token_hash = ?',
      [verificationHash]
    );

    if (!verificationRecord) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    if (Number(verificationRecord.used) === 1) {
      return res.status(400).json({ error: 'Verification token has already been used' });
    }

    if (new Date(verificationRecord.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    const verifiedAt = nowIso();

    await dbRun('UPDATE users SET is_verified = 1, email_verified_at = ? WHERE id = ?', [verifiedAt, verificationRecord.user_id]);
    await dbRun('UPDATE email_verification_tokens SET used = 1, used_at = ? WHERE id = ?', [verifiedAt, verificationRecord.id]);
    await dbRun(
      'DELETE FROM email_verification_tokens WHERE user_id = ? AND used = 0 AND id != ?',
      [verificationRecord.user_id, verificationRecord.id]
    );

    res.json({ message: 'Email verified successfully.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Unable to verify email.' });
  }
});

router.post('/refresh-token', authRateLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const refreshHash = hashToken(refreshToken);
    const tokenRecord = await dbGet(
      'SELECT * FROM refresh_tokens WHERE token_hash = ?',
      [refreshHash]
    );

    if (
      !tokenRecord ||
      Number(tokenRecord.revoked) === 1 ||
      new Date(tokenRecord.expires_at).getTime() < Date.now()
    ) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await dbGet('SELECT id, email, role, school_id FROM users WHERE id = ?', [tokenRecord.user_id]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, schoolId: user.school_id },
      JWT_SECRET,
      { expiresIn: JWT_ACCESS_EXPIRES_IN }
    );

    const nextRefreshValue = generateRandomToken(REFRESH_TOKEN_BYTES);
    const nextRefreshHash = hashToken(nextRefreshValue);
    const nextRefreshExpiresAt = addMilliseconds(JWT_REFRESH_TTL_MS);

    await dbRun('UPDATE refresh_tokens SET revoked = 1, revoked_at = ? WHERE id = ?', [nowIso(), tokenRecord.id]);
    await dbRun(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, nextRefreshHash, nextRefreshExpiresAt]
    );

    res.json({
      token: newAccessToken,
      refreshToken: nextRefreshValue,
      expiresIn: JWT_ACCESS_EXPIRES_IN
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Unable to refresh session.' });
  }
});

module.exports = { publicRouter: router };
