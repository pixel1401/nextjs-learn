import prisma from '@/lib/prisma';


async function listInvoices() {
    const data = await prisma.invoice.findMany({
        where: {
            amount: 666, // Условие фильтрации
        },
        select: {
            amount: true, // Поля из таблицы invoices
            customer: {
                select: {
                    name: true, // Поля из связанной таблицы customers
                },
            },
        },
    });

	return data;
}

export async function GET() {

  try {
      await prisma.$connect();
      const data = await listInvoices();
  	return Response.json(data);
  } catch (error) {
  	return Response.json({ error }, { status: 500 });
  } finally {
      await prisma.$disconnect();
  }
}
