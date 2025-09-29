const { logger } = require('../utils/logger');

/**
 * Comprehensive CRUD Service
 * Generic CRUD operations with RBAC integration
 */

class CRUDService {
  constructor() {
    this.operations = {
      create: 'write',
      read: 'read',
      update: 'write',
      delete: 'delete',
      list: 'read',
      manage: 'manage'
    };
  }

  /**
   * Create a new record
   * @param {Object} model - Sequelize model
   * @param {Object} data - Record data
   * @param {Object} user - User context
   * @returns {Promise<Object>} - Created record
   */
  async create(model, data, user) {
    try {
      logger.debug(`Creating ${model.name} record for user ${user.id}`);
      
      // Add user context to data
      const recordData = {
        ...data,
        userId: user.id,
        createdBy: user.id,
        updatedBy: user.id
      };

      const record = await model.create(recordData);
      logger.info(`Created ${model.name} record: ${record.id}`);
      
      return {
        success: true,
        data: record,
        message: `${model.name} created successfully`
      };
    } catch (error) {
      logger.error(`Error creating ${model.name}:`, error);
      throw error;
    }
  }

  /**
   * Read a single record
   * @param {Object} model - Sequelize model
   * @param {string} id - Record ID
   * @param {Object} user - User context
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Record data
   */
  async read(model, id, user, options = {}) {
    try {
      logger.debug(`Reading ${model.name} record ${id} for user ${user.id}`);
      
      const whereClause = { id };
      
      // Non-admin users can only access their own records
      if (user.role !== 'admin' && options.requireOwnership !== false) {
        whereClause.userId = user.id;
      }

      const record = await model.findOne({
        where: whereClause,
        ...options
      });

      if (!record) {
        logger.warn(`${model.name} record ${id} not found for user ${user.id}`);
        return {
          success: false,
          error: { message: `${model.name} not found` }
        };
      }

      logger.info(`Retrieved ${model.name} record: ${record.id}`);
      return {
        success: true,
        data: record,
        message: `${model.name} retrieved successfully`
      };
    } catch (error) {
      logger.error(`Error reading ${model.name}:`, error);
      throw error;
    }
  }

  /**
   * Update a record
   * @param {Object} model - Sequelize model
   * @param {string} id - Record ID
   * @param {Object} data - Update data
   * @param {Object} user - User context
   * @returns {Promise<Object>} - Updated record
   */
  async update(model, id, data, user) {
    try {
      logger.debug(`Updating ${model.name} record ${id} for user ${user.id}`);
      
      // Check if record exists and user has access
      const existingRecord = await this.read(model, id, user);
      if (!existingRecord.success) {
        return existingRecord;
      }

      // Add update context
      const updateData = {
        ...data,
        updatedBy: user.id,
        updatedAt: new Date()
      };

      const [updatedRows] = await model.update(updateData, {
        where: { id },
        returning: true
      });

      if (updatedRows === 0) {
        logger.warn(`No ${model.name} record updated for ID ${id}`);
        return {
          success: false,
          error: { message: `${model.name} not updated` }
        };
      }

      const updatedRecord = await model.findByPk(id);
      logger.info(`Updated ${model.name} record: ${id}`);
      
      return {
        success: true,
        data: updatedRecord,
        message: `${model.name} updated successfully`
      };
    } catch (error) {
      logger.error(`Error updating ${model.name}:`, error);
      throw error;
    }
  }

  /**
   * Delete a record
   * @param {Object} model - Sequelize model
   * @param {string} id - Record ID
   * @param {Object} user - User context
   * @returns {Promise<Object>} - Deletion result
   */
  async delete(model, id, user) {
    try {
      logger.debug(`Deleting ${model.name} record ${id} for user ${user.id}`);
      
      // Check if record exists and user has access
      const existingRecord = await this.read(model, id, user);
      if (!existingRecord.success) {
        return existingRecord;
      }

      await model.destroy({
        where: { id }
      });

      logger.info(`Deleted ${model.name} record: ${id}`);
      return {
        success: true,
        message: `${model.name} deleted successfully`
      };
    } catch (error) {
      logger.error(`Error deleting ${model.name}:`, error);
      throw error;
    }
  }

  /**
   * List records with pagination and filtering
   * @param {Object} model - Sequelize model
   * @param {Object} user - User context
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - List of records
   */
  async list(model, user, options = {}) {
    try {
      logger.debug(`Listing ${model.name} records for user ${user.id}`);
      
      const {
        page = 1,
        limit = 10,
        order = [['createdAt', 'DESC']],
        where = {},
        include = [],
        attributes = null
      } = options;

      const offset = (page - 1) * limit;
      
      // Build where clause
      const whereClause = { ...where };
      
      // Non-admin users can only access their own records
      if (user.role !== 'admin' && options.requireOwnership !== false) {
        whereClause.userId = user.id;
      }

      const queryOptions = {
        where: whereClause,
        order,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include
      };

      if (attributes) {
        queryOptions.attributes = attributes;
      }

      const { count, rows } = await model.findAndCountAll(queryOptions);
      
      const totalPages = Math.ceil(count / limit);
      
      logger.info(`Listed ${rows.length} ${model.name} records for user ${user.id}`);
      
      return {
        success: true,
        data: {
          records: rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalRecords: count,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        },
        message: `${model.name} records retrieved successfully`
      };
    } catch (error) {
      logger.error(`Error listing ${model.name}:`, error);
      throw error;
    }
  }

  /**
   * Search records
   * @param {Object} model - Sequelize model
   * @param {string} searchTerm - Search term
   * @param {Object} user - User context
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Search results
   */
  async search(model, searchTerm, user, options = {}) {
    try {
      logger.debug(`Searching ${model.name} records for "${searchTerm}" by user ${user.id}`);
      
      const {
        searchFields = ['name', 'description', 'title'],
        page = 1,
        limit = 10,
        order = [['createdAt', 'DESC']]
      } = options;

      const offset = (page - 1) * limit;
      
      // Build search conditions
      const searchConditions = searchFields.map(field => ({
        [field]: {
          [model.sequelize.Op.iLike]: `%${searchTerm}%`
        }
      }));

      const whereClause = {
        [model.sequelize.Op.or]: searchConditions
      };
      
      // Non-admin users can only search their own records
      if (user.role !== 'admin' && options.requireOwnership !== false) {
        whereClause.userId = user.id;
      }

      const { count, rows } = await model.findAndCountAll({
        where: whereClause,
        order,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      const totalPages = Math.ceil(count / limit);
      
      logger.info(`Found ${rows.length} ${model.name} records matching "${searchTerm}"`);
      
      return {
        success: true,
        data: {
          records: rows,
          searchTerm,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalRecords: count,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        },
        message: `Found ${rows.length} ${model.name} records matching "${searchTerm}"`
      };
    } catch (error) {
      logger.error(`Error searching ${model.name}:`, error);
      throw error;
    }
  }

  /**
   * Get record statistics
   * @param {Object} model - Sequelize model
   * @param {Object} user - User context
   * @param {Object} options - Statistics options
   * @returns {Promise<Object>} - Statistics data
   */
  async getStats(model, user, options = {}) {
    try {
      logger.debug(`Getting ${model.name} statistics for user ${user.id}`);
      
      const whereClause = {};
      
      // Non-admin users can only see their own statistics
      if (user.role !== 'admin' && options.requireOwnership !== false) {
        whereClause.userId = user.id;
      }

      const totalCount = await model.count({ where: whereClause });
      
      // Get counts by status if status field exists
      const statusCounts = {};
      if (model.rawAttributes.status) {
        const statusGroups = await model.findAll({
          attributes: [
            'status',
            [model.sequelize.fn('COUNT', model.sequelize.col('id')), 'count']
          ],
          where: whereClause,
          group: ['status']
        });
        
        statusGroups.forEach(group => {
          statusCounts[group.status] = parseInt(group.dataValues.count);
        });
      }

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentCount = await model.count({
        where: {
          ...whereClause,
          createdAt: {
            [model.sequelize.Op.gte]: thirtyDaysAgo
          }
        }
      });

      logger.info(`Retrieved ${model.name} statistics for user ${user.id}`);
      
      return {
        success: true,
        data: {
          total: totalCount,
          recent: recentCount,
          statusCounts,
          lastUpdated: new Date()
        },
        message: `${model.name} statistics retrieved successfully`
      };
    } catch (error) {
      logger.error(`Error getting ${model.name} statistics:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const crudService = new CRUDService();

module.exports = crudService;
