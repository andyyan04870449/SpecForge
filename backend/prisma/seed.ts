import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');
  
  // Create test user
  const hashedPassword = await bcrypt.hash('Test123456', 10);
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      password: hashedPassword,
    },
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
    },
  });
  
  console.log({ testUser });
  
  // Create test project
  const testProject = await prisma.project.upsert({
    where: { 
      id: 'test-project-1',
    },
    update: {},
    create: {
      id: 'test-project-1',
      projectCode: 'TEST001',
      name: '測試專案',
      description: '用於測試系統分析功能',
      version: '1.0.0',
      ownerId: testUser.id,
    },
  });
  
  console.log({ testProject });
  
  // Create test module
  const testModule = await prisma.module.upsert({
    where: {
      id: 'test-module-1',
    },
    update: {},
    create: {
      id: 'test-module-1',
      modCode: 'MOD-001',
      title: '身份驗證模組',
      description: '處理使用者登入和身份驗證',
      projectId: testProject.id,
      order: 1,
    },
  });
  
  console.log({ testModule });
  
  // Create test use case
  const testUseCase = await prisma.useCase.upsert({
    where: {
      id: 'test-uc-1',
    },
    update: {},
    create: {
      id: 'test-uc-1',
      ucCode: 'UC-001',
      title: '使用者登入',
      summary: '使用者透過帳號密碼登入系統',
      moduleId: testModule.id,
      projectId: testProject.id,
    },
  });
  
  console.log({ testUseCase });
  
  // Create test sequence diagram
  const testSequence = await prisma.sequenceDiagram.create({
    data: {
      sdCode: 'SD-001',
      title: '登入流程',
      mermaidSrc: `sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as Database
    
    U->>F: Enter credentials
    F->>B: POST /api/auth/login
    B->>DB: Verify credentials
    DB-->>B: User data
    B-->>F: JWT token
    F-->>U: Login successful`,
      useCaseId: testUseCase.id,
      projectId: testProject.id,
    },
  });
  
  console.log({ testSequence });
  
  // Create test API contract
  const testApiContract = await prisma.apiContract.create({
    data: {
      apiCode: 'API-AUTH-001',
      title: '登入 API',
      method: 'POST',
      endpoint: '/api/auth/login',
      description: '使用者登入端點',
      domain: 'AUTH',
      requestSpec: {
        body: [
          {
            name: 'email',
            type: 'string',
            required: true,
            description: '使用者信箱',
          },
          {
            name: 'password',
            type: 'string',
            required: true,
            description: '使用者密碼',
          },
        ],
      },
      responseSpec: {
        success: true,
        data: {
          token: 'string',
          user: {
            id: 'string',
            email: 'string',
            name: 'string',
          },
        },
      },
      statusCodes: [
        {
          code: 200,
          description: '登入成功',
        },
        {
          code: 401,
          description: '登入失敗',
        },
      ],
      projectId: testProject.id,
    },
  });
  
  console.log({ testApiContract });
  
  // Create test DTO schema
  const testDtoSchema = await prisma.dtoSchema.create({
    data: {
      dtoCode: 'DTO-USER-001',
      title: 'UserDTO',
      kind: 'response',
      schemaJson: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: '使用者 ID',
          },
          email: {
            type: 'string',
            description: '使用者信箱',
          },
          name: {
            type: 'string',
            description: '使用者名稱',
          },
        },
        required: ['id', 'email'],
      },
      projectId: testProject.id,
    },
  });
  
  console.log({ testDtoSchema });
  
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });