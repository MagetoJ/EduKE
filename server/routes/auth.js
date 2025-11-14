/**
 * Authentication Routes
 * Handles school registration, login, logout, password reset, etc.
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { tenantContext } = require('../middleware/tenant');

// Apply tenant context to all routes
router.use(tenantContext);

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
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to register school'
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
    res.status(401).json({
      success: false,
      error: error.message || 'Invalid credentials'
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
      return res.status(401).json({
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
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
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
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to reset password'
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
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to verify email'
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
