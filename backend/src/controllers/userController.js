const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authMiddleware: auth } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { User, Document, Signature, AuditTrail, Subscription } = require('../services/databaseService');

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private
 */
router.get('/', auth, asyncHandler(async (req, res) => {
  try {
    const options = {
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password', 'privateKey', 'signatureKey'] }
    };

    // Add filtering
    if (req.query.role) {
      options.where = { role: req.query.role };
    }
    if (req.query.isActive !== undefined) {
      options.where = { ...options.where, isActive: req.query.isActive === 'true' };
    }

    const { count, rows } = await User.findAndCountAll(options);
    
    res.json({
      success: true,
      data: {
        users: rows,
        pagination: {
          total: count,
          page: parseInt(options.page),
          limit: parseInt(options.limit),
          pages: Math.ceil(count / options.limit)
        }
      },
      message: 'Users retrieved successfully'
    });
  } catch (error) {
    logger.error('Get users failed:', error);
    throw error;
  }
}));

/**
 * @route   GET /api/users/:id
 * @desc    Get single user
 * @access  Private
 */
router.get('/:id', auth, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user can access this record
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied. You can only view your own profile.' }
      });
    }

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password', 'privateKey', 'signatureKey'] },
      include: [
        {
          model: Subscription,
          as: 'subscriptions',
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    res.json({
      success: true,
      data: user,
      message: 'User retrieved successfully'
    });
  } catch (error) {
    logger.error('Get user failed:', error);
    throw error;
  }
}));

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private
 */
router.put('/:id', auth, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Check if user can update this record
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied. You can only update your own profile.' }
      });
    }

    // Remove sensitive fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData.role;
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const [updatedRows] = await User.update(updateData, {
      where: { id },
      returning: true
    });

    if (updatedRows === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password', 'privateKey', 'signatureKey'] }
    });

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    logger.error('Update user failed:', error);
    throw error;
  }
}));

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete('/:id', auth, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    // Only admin can delete users
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Admin access required' }
      });
    }
    
    // Prevent self-deletion
    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        error: { message: 'You cannot delete your own account' }
      });
    }

    const deletedRows = await User.destroy({
      where: { id }
    });

    if (deletedRows === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Delete user failed:', error);
    throw error;
  }
}));

module.exports = router;