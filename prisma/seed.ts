import { PrismaClient, RequestStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // Clear existing data
    await prisma.systemLog.deleteMany()
    await prisma.helpRequest.deleteMany()
    await prisma.knowledgeBase.deleteMany()

    // Seed Knowledge Base with salon-specific FAQ
    const knowledgeEntries = [
        {
            question: "What are your business hours?",
            answer: "Luxe Beauty Salon is open Tuesday through Saturday from 9 AM to 7 PM, and Sunday from 10 AM to 5 PM. We are closed on Mondays for staff training and maintenance.",
            source: "manual"
        },
        {
            question: "How can I schedule an appointment?",
            answer: "You can book an appointment by calling us at (555) 123-LUXE, using our online booking system at luxebeautysalon.com, or through our mobile app. Walk-ins are welcome but appointments are recommended.",
            source: "manual"
        },
        {
            question: "What services do you offer?",
            answer: "We offer a full range of beauty services including haircuts, coloring, highlights, balayage, perms, blowouts, manicures, pedicures, facials, eyebrow shaping, waxing, and special occasion styling for weddings and events.",
            source: "manual"
        },
        {
            question: "What are your prices?",
            answer: "Our prices vary by service: Haircuts start at $45, color services from $85, highlights from $120, manicures from $35, pedicures from $50, and facials from $75. Please call for a detailed price list or visit our website.",
            source: "manual"
        },
        {
            question: "What is your cancellation policy?",
            answer: "We require at least 24 hours notice for appointment cancellations or changes. Same-day cancellations or no-shows may be charged a 50% service fee. We understand emergencies happen, so please call us to discuss.",
            source: "manual"
        },
        {
            question: "Where are you located?",
            answer: "Luxe Beauty Salon is located at 456 Fashion Avenue, Suite 200, in the heart of downtown. We have free parking in the rear of the building and are easily accessible by bus routes 12 and 34.",
            source: "manual"
        },
        {
            question: "Do you accept walk-ins?",
            answer: "Yes, we welcome walk-ins based on availability, but we highly recommend booking an appointment to guarantee your preferred time slot. Walk-in wait times can vary depending on the day and time.",
            source: "manual"
        },
        {
            question: "What payment methods do you accept?",
            answer: "We accept cash, all major credit cards (Visa, MasterCard, American Express, Discover), debit cards, and digital payments including Apple Pay and Google Pay. We also offer gift cards.",
            source: "manual"
        },
        {
            question: "Do you offer bridal services?",
            answer: "Yes! We specialize in bridal hair and makeup services. We offer bridal trials, wedding day styling, and can accommodate bridal parties. Please book bridal consultations at least 2 months in advance.",
            source: "manual"
        },
        {
            question: "What hair products do you use?",
            answer: "We use premium professional products including Redken, L'Oréal Professional, Olaplex, and Moroccan Oil. All our products are salon-grade and many are available for purchase to maintain your look at home.",
            source: "manual"
        },
        {
            question: "Do you offer color consultations?",
            answer: "Absolutely! We offer complimentary color consultations to help you choose the perfect shade and technique. Our colorists will assess your skin tone, lifestyle, and maintenance preferences to recommend the best options.",
            source: "manual"
        },
        {
            question: "How long do appointments typically take?",
            answer: "Appointment times vary by service: haircuts take 45-60 minutes, full color 2-3 hours, highlights 3-4 hours, manicures 30-45 minutes, pedicures 45-60 minutes, and facials 60-90 minutes.",
            source: "manual"
        },
        {
            question: "Do you have parking?",
            answer: "Yes, we have free parking available behind our building on Fashion Avenue. There are also metered street parking spots available, and a public parking garage is located two blocks away on Main Street.",
            source: "manual"
        },
        {
            question: "Can I bring my children?",
            answer: "We welcome children for their own services, but ask that children not receiving services be supervised at all times. For the safety and comfort of all clients, we recommend arranging childcare during your appointment.",
            source: "manual"
        },
        {
            question: "Do you offer senior or student discounts?",
            answer: "Yes! We offer a 15% discount for seniors (65+) on Tuesdays and Wednesdays, and a 10% student discount with valid ID. Military personnel receive a 10% discount year-round.",
            source: "manual"
        }
    ]

    console.log('📚 Creating knowledge base entries...')
    for (const entry of knowledgeEntries) {
        await prisma.knowledgeBase.create({
            data: entry
        })
    }

    // Seed some sample help requests for demonstration
    const sampleRequests = [
        {
            callerId: "caller_001",
            callerPhone: "+1555123456",
            question: "I have very damaged hair from bleaching and I'm wondering if you can help restore it. What treatments do you recommend?",
            status: RequestStatus.PENDING,
            metadata: {
                hairCondition: "severely_damaged",
                previousTreatments: "bleaching",
                urgency: "medium"
            }
        },
        {
            callerId: "caller_002",
            callerPhone: "+1555123457",
            question: "Can you accommodate a bridal party of 8 people on a Saturday morning in March?",
            status: RequestStatus.RESOLVED,
            answer: "Yes, we can accommodate your bridal party of 8! For Saturday mornings in March, we recommend booking our VIP bridal package which includes the entire salon. Please call to discuss specific dates and services. We'll need a 50% deposit to secure your date.",
            resolvedBy: "supervisor_sarah",
            metadata: {
                partySize: 8,
                serviceType: "bridal_party",
                preferredMonth: "March",
                followUpRequired: true
            }
        },
        {
            callerId: "caller_003",
            callerPhone: "+1555123458",
            question: "Do you have any stylists who specialize in curly hair textures and natural hair care?",
            status: RequestStatus.UNRESOLVED,
            timeoutAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
            metadata: {
                hairType: "curly_natural",
                specialtyRequest: "texture_specialist",
                timeoutReason: "no_supervisor_response"
            }
        }
    ]

    console.log('📞 Creating sample help requests...')
    for (const request of sampleRequests) {
        await prisma.helpRequest.create({
            data: request
        })
    }

    // Seed some system logs
    const systemLogs = [
        {
            level: "info",
            event: "SYSTEM_STARTUP",
            message: "Luxe Beauty Salon AI Voice Receptionist system started successfully"
        },
        {
            level: "info",
            event: "CALL_RECEIVED",
            message: "Incoming call received from +1555123456",
            metadata: {
                callerId: "caller_001",
                duration: 180,
                resolved: false,
                topic: "hair_damage_consultation"
            }
        },
        {
            level: "info",
            event: "HELP_REQUEST_CREATED",
            message: "Help request created for hair treatment consultation",
            metadata: {
                requestId: "salon_request_001",
                confidence: 0.4,
                category: "hair_treatment"
            }
        },
        {
            level: "info",
            event: "HELP_REQUEST_RESOLVED",
            message: "Bridal party booking request resolved by supervisor",
            metadata: {
                requestId: "salon_request_002",
                resolvedBy: "supervisor_sarah",
                resolutionTime: 420,
                category: "bridal_services"
            }
        },
        {
            level: "info",
            event: "KNOWLEDGE_BASE_QUERY",
            message: "Successfully answered question about business hours",
            metadata: {
                question: "business_hours",
                confidence: 0.95,
                responseTime: 1.2
            }
        }
    ]

    console.log('📋 Creating system logs...')
    for (const log of systemLogs) {
        await prisma.systemLog.create({
            data: log
        })
    }

    console.log('✅ Luxe Beauty Salon database seeded successfully!')
    console.log(`📚 Created ${knowledgeEntries.length} salon knowledge base entries`)
    console.log(`📞 Created ${sampleRequests.length} sample help requests`)
    console.log(`📋 Created ${systemLogs.length} system log entries`)
    console.log('💄 Ready to handle salon inquiries!')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error('❌ Error seeding database:', e)
        await prisma.$disconnect()
        process.exit(1)
    })