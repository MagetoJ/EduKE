/**
 * Authentication Routes
 * Handles school registration, login, logout, password reset, etc.
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { tenantContext } = require('../middleware/tenant');

// Apply tenant context to all routes

/**
 * POST /api/auth/register-school
 * Register a new school with admin user
 */
router.post('/register-school', async (req, res) => {
  try {
    const { school, admin } = req.body;

    // Validate required fields
    if (!school?.name || !admin?.email || !admin?.password) {
      return res.status(400).json({
        success: false,
        error: 'School name, admin email, and password are required'
      });
    }

    if (!admin.firstName || !admin.lastName) {
      return res.status(400).json({
        success: false,
        error: 'Admin first name and last name are required'
      });
    }

    // Additional validation
    if (admin.password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Register school
    const result = await authService.registerSchool(school, admin);

    res.status(201).json({
      success: true,
      message: 'School registered successfully',
      data: {
        school: result.school,
        user: result.user
        // Note: verification token should be sent via email, not returned in response
      }
    });

  } catch (error) {
    console.error('School registration error:', error);

    // Handle specific errors
    let statusCode = 500;
    let errorMessage = 'Failed to register school';

    if (error.message === 'Email already registered') {
      statusCode = 409; // Conflict
      errorMessage = error.message;
    } else if (error.message === 'Trial plan not found') {
      statusCode = 500;
      errorMessage = 'Service configuration error';
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Authenticate user
    const result = await authService.login(email, password);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);

    // Handle specific errors
    let statusCode = 401;
    let errorMessage = 'Invalid credentials';

    if (error.message === 'Account is not active') {
      statusCode = 403; // Forbidden
      errorMessage = error.message;
    } else if (error.message === 'School account is not active') {
      statusCode = 403;
      errorMessage = error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * POST /api/auth/refresh-token
 * Refresh access token
 */
router.post('/refresh-token', async (req, res) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    // Get new access token
    const result = await authService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);

    // Handle specific errors
    let statusCode = 401;
    let errorMessage = 'Invalid refresh token';

    if (error.message === 'Invalid or expired refresh token') {
      errorMessage = error.message;
    } else if (error.message === 'User not found or inactive') {
      statusCode = 403;
      errorMessage = 'User account is inactive';
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    const result = await authService.requestPasswordReset(email);

    // Note: In production, send reset token via email
    // Don't return it in the response
    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    const result = await authService.resetPassword(token, password);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Password reset error:', error);

    // Handle specific errors
    let statusCode = 400;
    let errorMessage = 'Failed to reset password';

    if (error.message === 'Invalid or expired reset token') {
      statusCode = 401; // Unauthorized
      errorMessage = error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email address
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required'
      });
    }

    const result = await authService.verifyEmail(token);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Email verification error:', error);

    // Handle specific errors
    let statusCode = 400;
    let errorMessage = 'Failed to verify email';

    if (error.message === 'Invalid or expired verification token') {
      statusCode = 401; // Unauthorized
      errorMessage = error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    res.json({
      success: true,
      data: {
        user: req.user
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user information'
    });
  }
});

module.exports = router;
