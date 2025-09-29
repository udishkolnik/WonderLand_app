const { User, Document, Signature, AuditTrail } = require('../services/databaseService');
const { logger } = require('../utils/logger');

async function populateSimpleData() {
  try {
    console.log('🚀 Starting simple data population...');

    // Get existing users
    const users = await User.findAll();
    console.log(`Found ${users.length} existing users`);

    if (users.length === 0) {
      console.log('No users found. Please create users first.');
      return;
    }

    const adminUser = users.find(u => u.role === 'admin') || users[0];
    const regularUsers = users.filter(u => u.role === 'user');

    // 1. Create real legal documents
    console.log('📄 Creating legal documents...');
    const documents = await Document.bulkCreate([
      {
        title: 'Terms of Service',
        content: `# Terms of Service

## 1. Acceptance of Terms
By accessing and using SmartStart Platform, you accept and agree to be bound by the terms and provision of this agreement.

## 2. Use License
Permission is granted to temporarily download one copy of the materials on SmartStart Platform for personal, non-commercial transitory viewing only.

## 3. Disclaimer
The materials on SmartStart Platform are provided on an 'as is' basis. SmartStart Platform makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties.

## 4. Limitations
In no event shall SmartStart Platform or its suppliers be liable for any damages arising out of the use or inability to use the materials on SmartStart Platform.

## 5. Privacy Policy
Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Platform.

## 6. Contact Information
For questions about these Terms of Service, please contact us at legal@alicesolutionsgroup.com.`,
        type: 'legal',
        status: 'active',
        userId: adminUser.id
      },
      {
        title: 'Privacy Policy',
        content: `# Privacy Policy

## Information We Collect
We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.

## How We Use Your Information
We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.

## Information Sharing
We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.

## Data Security
We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

## Your Rights
You have the right to access, update, or delete your personal information. You may also opt out of certain communications from us.

## Contact Us
If you have any questions about this Privacy Policy, please contact us at privacy@alicesolutionsgroup.com.`,
        type: 'legal',
        status: 'active',
        userId: adminUser.id
      },
      {
        title: 'Non-Disclosure Agreement',
        content: `# Non-Disclosure Agreement

## Confidential Information
"Confidential Information" means all non-public, proprietary or confidential information disclosed by one party to the other.

## Obligations
Each party agrees to hold the other's Confidential Information in strict confidence and not to disclose it to any third party.

## Exceptions
The obligations of confidentiality shall not apply to information that is publicly available or becomes publicly available through no breach of this agreement.

## Term
This agreement shall remain in effect for a period of five (5) years from the date of execution.

## Governing Law
This agreement shall be governed by the laws of the State of California.

## Contact
For questions regarding this NDA, contact legal@alicesolutionsgroup.com.`,
        type: 'legal',
        status: 'active',
        userId: adminUser.id
      },
      {
        title: 'Contributor Agreement',
        content: `# Contributor Agreement

## Contribution License
By contributing to SmartStart Platform, you grant us a perpetual, worldwide, non-exclusive, royalty-free license to use, modify, and distribute your contributions.

## Original Work
You represent that your contributions are your original work and do not infringe on any third-party rights.

## No Compensation
Contributions are made voluntarily and without expectation of compensation.

## Code of Conduct
All contributors must adhere to our Code of Conduct and community guidelines.

## Termination
Either party may terminate this agreement at any time with written notice.

## Contact
Questions about contributing? Contact contribute@alicesolutionsgroup.com.`,
        type: 'legal',
        status: 'active',
        userId: adminUser.id
      }
    ]);
    console.log(`✅ Created ${documents.length} legal documents`);

    // 2. Create signatures for users
    console.log('✍️ Creating document signatures...');
    for (const user of regularUsers) {
      for (const doc of documents) {
        await Signature.create({
          userId: user.id,
          documentId: doc.id,
          signatureData: JSON.stringify({
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            ipAddress: '127.0.0.1',
            userAgent: 'SmartStart Platform',
            signedAt: new Date().toISOString()
          }),
          signatureHash: `hash_${user.id}_${doc.id}_${Date.now()}`,
          signedAt: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'SmartStart Platform'
        });
      }
    }
    console.log(`✅ Created signatures for ${regularUsers.length} users`);

    // 3. Create audit trails
    console.log('📊 Creating audit trails...');
    const auditActions = [
      'USER_LOGIN',
      'DOCUMENT_SIGNED',
      'VENTURE_CREATED',
      'STAGE_COMPLETED',
      'COLLABORATION_STARTED',
      'PAYMENT_PROCESSED'
    ];

    for (const user of regularUsers) {
      for (let i = 0; i < 15; i++) {
        const action = auditActions[Math.floor(Math.random() * auditActions.length)];
        await AuditTrail.create({
          userId: user.id,
          action: action,
          details: JSON.stringify({
            timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            ipAddress: '127.0.0.1',
            userAgent: 'SmartStart Platform',
            stage: action === 'STAGE_COMPLETED' ? ['discovery', 'development', 'launch'][Math.floor(Math.random() * 3)] : null
          }),
          auditHash: `audit_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ipAddress: '127.0.0.1',
          userAgent: 'SmartStart Platform'
        });
      }
    }
    console.log(`✅ Created audit trails for users`);

    // 4. Summary
    const finalCounts = {
      users: await User.count(),
      documents: await Document.count(),
      signatures: await Signature.count(),
      auditTrails: await AuditTrail.count()
    };

    console.log('\n🎉 Simple data population completed!');
    console.log('📊 Final database counts:');
    Object.entries(finalCounts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error populating simple data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  populateSimpleData()
    .then(() => {
      console.log('✅ Simple data population completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Simple data population failed:', error);
      process.exit(1);
    });
}

module.exports = populateSimpleData;
