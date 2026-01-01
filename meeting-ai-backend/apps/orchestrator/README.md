```bash
cd e:\Full Stack Projects\Meeting AI Agent\meeting-ai-backend\apps\orchestrator

# Initialize package.json
npm init -y

# Install dependencies
npm install fastify @fastify/cors ioredis @prisma/client dotenv pino axios openai

# Install dev dependencies
npm install -D typescript @types/node tsx nodemon prisma
npx tsc --init
npx prisma init
```

.env
```bash
    PORT=4000
    HOST=0.0.0.0
    NODE_ENV=development

    # Database
    DATABASE_URL="mysql://root:your_password@localhost:3306/meeting_ai"

    # Redis
    REDIS_HOST=localhost
    REDIS_PORT=6379

    # OpenAI
    OPENAI_API_KEY=sk-your-openai-key

    # Knowledge Service (gRPC)
    KNOWLEDGE_SERVICE_URL=localhost:50051
```

prisma/schema.prisma

```bash
    generator client {
    provider = "prisma-client-js"
    }

    datasource db {
    provider = "mysql"
    url      = env("DATABASE_URL")
    }

    model User {
    id        String   @id @default(uuid())
    email     String   @unique
    name      String?
    avatar    String?
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    meetings     Meeting[]
    questions    UserQuestion[]
    hostedMeetings Meeting[] @relation("MeetingHost")
    }

    model Meeting {
    id          String        @id @default(uuid())
    title       String
    meetingUrl  String?
    platform    MeetingPlatform @default(GOOGLE_MEET)
    status      MeetingStatus   @default(ACTIVE)
    startTime   DateTime      @default(now())
    endTime     DateTime?
    createdAt   DateTime      @default(now())
    updatedAt   DateTime      @updatedAt

    // Relations
    hostId      String
    host        User          @relation("MeetingHost", fields: [hostId], references: [id])
    userId      String
    user        User          @relation(fields: [userId], references: [id])
    
    participants Participant[]
    transcripts  Transcript[]
    chatMessages ChatMessage[]
    report       MeetingReport?
    questions    UserQuestion[]
    }

    model Participant {
    id        String    @id @default(uuid())
    name      String
    email     String?
    joinedAt  DateTime  @default(now())
    leftAt    DateTime?
    isHost    Boolean   @default(false)
    createdAt DateTime  @default(now())

    meetingId String
    meeting   Meeting   @relation(fields: [meetingId], references: [id], onDelete: Cascade)

    @@index([meetingId])
    }

    model Transcript {
    id          String   @id @default(uuid())
    speakerName String?
    text        String   @db.Text
    timestamp   DateTime @default(now())
    confidence  Float?
    createdAt   DateTime @default(now())

    meetingId   String
    meeting     Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)

    @@index([meetingId])
    @@index([timestamp])
    }

    model ChatMessage {
    id         String   @id @default(uuid())
    senderName String
    message    String   @db.Text
    timestamp  DateTime @default(now())
    createdAt  DateTime @default(now())

    meetingId  String
    meeting    Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)

    @@index([meetingId])
    }

    model MeetingReport {
    id          String   @id @default(uuid())
    summary     String?  @db.Text
    actionItems Json?
    keyTopics   Json?
    sentiment   String?
    attendeeCount Int?
    generatedAt DateTime @default(now())
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    meetingId   String   @unique
    meeting     Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)
    }

    model UserQuestion {
    id        String   @id @default(uuid())
    question  String   @db.Text
    answer    String?  @db.Text
    askedAt   DateTime @default(now())
    createdAt DateTime @default(now())

    userId    String
    user      User     @relation(fields: [userId], references: [id])
    
    meetingId String
    meeting   Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)

    @@index([meetingId])
    @@index([userId])
    }

    enum MeetingPlatform {
    GOOGLE_MEET
    ZOOM
    TEAMS
    OTHER
    }

    enum MeetingStatus {
    ACTIVE
    ENDED
    CANCELLED
    }
```

```bash
    npx prisma db push
```


```bash
    // seed.ts
import { prisma, disconnectDatabase } from './src/database/prisma.js';

async function main() {
  try {
    // Upsert ensures we don't create duplicates if you run this twice
    const host = await prisma.user.upsert({
      where: { email: 'host@demo.com' },
      update: {}, // If exists, do nothing
      create: {
        email: 'host@demo.com',
        name: 'Demo Host',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo',
        // ID is auto-generated (UUID)
      },
    });

    console.log('✅ Host created successfully:');
    console.log(`   ID: ${host.id}`);
    console.log(`   Email: ${host.email}`);
  } catch (error) {
    console.error('❌ Error creating host:', error);
  } finally {
    await disconnectDatabase();
  }
}

main();
```