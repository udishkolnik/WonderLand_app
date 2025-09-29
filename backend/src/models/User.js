const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 255]
      }
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 50]
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 50]
      }
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'moderator'),
      defaultValue: 'user'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'isActive'
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'emailVerified'
    },
    email_verification_token: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'emailVerificationToken'
    },
    password_reset_token: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'passwordResetToken'
    },
    password_reset_expires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'passwordResetExpires'
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'lastLogin'
    },
    login_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'loginAttempts'
    },
    lock_until: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'lockUntil'
    },
    profile: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    preferences: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    public_key: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'publicKey'
    },
    private_key: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'privateKey'
    },
    signature_certificate: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'signatureCertificate'
    },
    signature_key: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'signatureKey'
    }
  }, {
    tableName: 'users',
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        fields: ['role']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['emailVerified']
      }
    ],
    hooks: {
      beforeCreate: (user) => {
        // Remove sensitive fields from JSON output
        user.dataValues = { ...user.dataValues };
      },
      beforeUpdate: (user) => {
        // Remove sensitive fields from JSON output
        user.dataValues = { ...user.dataValues };
      }
    }
  });

  // Instance methods
  User.prototype.toJSON = function () {
    const values = { ...this.dataValues };
    delete values.password;
    delete values.emailVerificationToken;
    delete values.passwordResetToken;
    delete values.passwordResetExpires;
    delete values.privateKey;
    delete values.signatureKey;
    return values;
  };

  User.prototype.getFullName = function () {
    return `${this.firstName} ${this.lastName}`;
  };

  User.prototype.isLocked = function () {
    return !!(this.lock_until && this.lock_until > Date.now());
  };

  User.prototype.incrementLoginAttempts = async function () {
    // If we have a previous lock that has expired, restart at 1
    if (this.lock_until && this.lock_until < Date.now()) {
      return this.update({
        login_attempts: 1,
        lock_until: null
      });
    }

    const updates = { login_attempts: this.login_attempts + 1 };

    // Lock account after 5 failed attempts for 2 hours
    if (this.login_attempts + 1 >= 5 && !this.isLocked()) {
      updates.lock_until = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
    }

    return this.update(updates);
  };

  User.prototype.resetLoginAttempts = async function () {
    return this.update({
      login_attempts: 0,
      lock_until: null
    });
  };

  // Class methods
  User.findByEmail = function (email) {
    return this.findOne({ where: { email: email.toLowerCase() } });
  };

  User.findActiveUsers = function () {
    return this.findAll({ where: { is_active: true } });
  };

  User.findByRole = function (role) {
    return this.findAll({ where: { role } });
  };

  return User;
};
