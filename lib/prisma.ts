import { PrismaClient } from '@prisma/client';

declare global {
    // Чтобы избежать ошибок в TypeScript, добавляем типизацию для global
    var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma; // Сохраняем инстанс в global только в режиме разработки
}

export default prisma;
