/**
 * Populate Database with Real Development Data
 * Creates realistic development users and projects with "dev" prefix
 */

const { sequelize } = require('../services/databaseService');
const { User, Venture, Document, Signature, AuditTrail } = require('../services/databaseService');
const crypto = require('crypto');

async function populateDevData() {
    try {
        console.log('🚀 Starting development data population...');

        // Create development users with "dev" prefix
        const devUsers = [
            {
                firstName: 'dev',
                lastName: 'Alice',
                email: 'dev.alice@smartstart.com',
                password: 'dev123456',
                role: 'founder',
                isActive: true,
                emailVerified: true
            },
            {
                firstName: 'dev',
                lastName: 'Bob',
                email: 'dev.bob@smartstart.com',
                password: 'dev123456',
                role: 'founder',
                isActive: true,
                emailVerified: true
            },
            {
                firstName: 'dev',
                lastName: 'Charlie',
                email: 'dev.charlie@smartstart.com',
                password: 'dev123456',
                role: 'founder',
                isActive: true,
                emailVerified: true
            }
        ];

        console.log('👥 Creating development users...');
        const createdUsers = [];
        for (const userData of devUsers) {
            const user = await User.create(userData);
            createdUsers.push(user);
            console.log(`✅ Created user: ${user.email}`);
        }

        // Create development ventures with "dev" prefix
        const devVentures = [
            {
                name: 'dev-Clinic CRM',
                description: 'A Jane App competitor for clinic management - development version',
                problemStatement: 'Clinics need better patient management systems',
                targetMarket: 'Healthcare providers',
                solution: 'Comprehensive clinic management platform',
                businessModel: 'SaaS subscription',
                revenueModel: 'Monthly/annual subscriptions',
                targetLaunchDate: new Date('2025-12-01'),
                tags: ['healthcare', 'saas', 'crm'],
                userId: createdUsers[0].id,
                status: 'development',
                stage: 'development',
                progress: 75,
                isPublic: true
            },
            {
                name: 'dev-AI Assistant',
                description: 'Intelligent assistant for entrepreneurs - development version',
                problemStatement: 'Entrepreneurs need better decision-making tools',
                targetMarket: 'Small business owners',
                solution: 'AI-powered business assistant',
                businessModel: 'Freemium SaaS',
                revenueModel: 'Subscription + usage-based',
                targetLaunchDate: new Date('2025-11-15'),
                tags: ['ai', 'ml', 'assistant'],
                userId: createdUsers[1].id,
                status: 'idea',
                stage: 'discovery',
                progress: 40,
                isPublic: true
            },
            {
                name: 'dev-EcoTracker',
                description: 'Carbon footprint tracking for businesses - development version',
                problemStatement: 'Companies need to track their environmental impact',
                targetMarket: 'Corporate sustainability teams',
                solution: 'Real-time carbon tracking platform',
                businessModel: 'Enterprise SaaS',
                revenueModel: 'Per-employee licensing',
                targetLaunchDate: new Date('2026-01-01'),
                tags: ['sustainability', 'enterprise', 'tracking'],
                userId: createdUsers[2].id,
                status: 'idea',
                stage: 'discovery',
                progress: 20,
                isPublic: true
            }
        ];

        console.log('🚀 Creating development ventures...');
        const createdVentures = [];
        for (const ventureData of devVentures) {
            const venture = await Venture.create(ventureData);
            createdVentures.push(venture);
            console.log(`✅ Created venture: ${venture.name}`);
        }

        // Create development documents
        const devDocuments = [
            {
                title: 'dev-User Agreement',
                content: 'Development version of user agreement for SmartStart Platform',
                type: 'user_agreement',
                version: '1.0.0',
                isRequired: true,
                userId: createdUsers[0].id
            },
            {
                title: 'dev-Privacy Policy',
                content: 'Development version of privacy policy for SmartStart Platform',
                type: 'privacy_policy',
                version: '1.0.0',
                isRequired: true,
                userId: createdUsers[0].id
            },
            {
                title: 'dev-Terms of Service',
                content: 'Development version of terms of service for SmartStart Platform',
                type: 'terms_of_service',
                version: '1.0.0',
                isRequired: true,
                userId: createdUsers[0].id
            }
        ];

        console.log('📄 Creating development documents...');
        const createdDocuments = [];
        for (const docData of devDocuments) {
            const document = await Document.create(docData);
            createdDocuments.push(document);
            console.log(`✅ Created document: ${document.title}`);
        }

        // Create development signatures
        console.log('✍️ Creating development signatures...');
        for (let i = 0; i < createdUsers.length; i++) {
            const user = createdUsers[i];
            for (const document of createdDocuments) {
                const signatureData = {
                    userId: user.id,
                    documentId: document.id,
                    signedAt: new Date(),
                    ipAddress: '127.0.0.1',
                    userAgent: 'SmartStart Development Environment'
                };

                const signature = await Signature.create({
                    userId: user.id,
                    documentId: document.id,
                    signatureData: JSON.stringify(signatureData),
                    signatureHash: crypto.createHash('sha256').update(`${user.id}-${document.id}-${Date.now()}`).digest('hex'),
                    signedAt: new Date(),
                    ipAddress: '127.0.0.1',
                    userAgent: 'SmartStart Development Environment'
                });

                console.log(`✅ Created signature for ${user.email} on ${document.title}`);
            }
        }

        // Create development audit trails
        console.log('📊 Creating development audit trails...');
        for (const user of createdUsers) {
            const auditTrail = await AuditTrail.create({
                userId: user.id,
                action: 'user_registered',
                details: `Development user ${user.email} registered`,
                ipAddress: '127.0.0.1',
                userAgent: 'SmartStart Development Environment',
                auditHash: crypto.createHash('sha256').update(`${user.id}-${Date.now()}`).digest('hex')
            });

            console.log(`✅ Created audit trail for ${user.email}`);
        }

        console.log('🎉 Development data population completed successfully!');
        console.log(`📊 Summary:`);
        console.log(`   - Users created: ${createdUsers.length}`);
        console.log(`   - Ventures created: ${createdVentures.length}`);
        console.log(`   - Documents created: ${createdDocuments.length}`);
        console.log(`   - Signatures created: ${createdUsers.length * createdDocuments.length}`);
        console.log(`   - Audit trails created: ${createdUsers.length}`);

    } catch (error) {
        console.error('❌ Error populating development data:', error);
        throw error;
    }
}

// Run the population script
if (require.main === module) {
    populateDevData()
        .then(() => {
            console.log('✅ Development data population completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Development data population failed:', error);
            process.exit(1);
        });
}

module.exports = { populateDevData };
