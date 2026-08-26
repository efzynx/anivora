import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __anivora_prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__anivora_prisma__ ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__anivora_prisma__ = prisma;
}

export * from '@prisma/client';
