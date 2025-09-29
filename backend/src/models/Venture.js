const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Venture = sequelize.define('Venture', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  stage: {
    type: DataTypes.ENUM('discovery', 'development', 'launch', 'scale', 'completed'),
    defaultValue: 'discovery'
  },
  status: {
    type: DataTypes.ENUM('active', 'paused', 'completed', 'cancelled'),
    defaultValue: 'active'
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  industry: {
    type: DataTypes.STRING,
    allowNull: true
  },
  targetMarket: {
    type: DataTypes.STRING,
    allowNull: true
  },
  businessModel: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fundingStage: {
    type: DataTypes.ENUM('bootstrap', 'seed', 'series_a', 'series_b', 'series_c', 'ipo'),
    defaultValue: 'bootstrap'
  },
  teamSize: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  revenue: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  valuation: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  launchDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  milestones: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  metrics: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  collaborators: {
    type: DataTypes.JSON,
    defaultValue: []
  }
}, {
  tableName: 'ventures',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['stage']
    },
    {
      fields: ['status']
    }
  ]
  });

  return Venture;
};