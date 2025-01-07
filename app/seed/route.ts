import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

const client = prisma;

async function seedUsers() {
  console.log('Seeding users...');

  const hashedUsers = await Promise.all(
      users.map(async (user) => ({
        ...user,
        hashedPassword: await bcrypt.hash(user.password, 10),
      }))
  );

  return hashedUsers.map((user) =>
      client.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          password: user.hashedPassword,
        },
      })
  );
}

async function seedInvoices() {
  console.log('Seeding invoices...');

  return invoices.map((invoice) => {
    return client.invoice.upsert({
      where: { id: invoice.customer_id },
      update: {},
      create: {
        customerId: invoice.customer_id,
        amount: invoice.amount,
        status: invoice.status,
        date: new Date(invoice.date),
      },
    });
  });
}

async function seedCustomers() {
  console.log('Seeding customers...');

  return customers.map((customer) => {
    return client.customer.upsert({
      where: { id: customer.id },
      update: {},
      create: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        image_url: customer.image_url,
      },
    });
  });
}

async function seedRevenue() {
  console.log('Seeding revenue...');

  return revenue.map((rev) => {
    return client.revenue.upsert({
      where: { month: rev.month },
      update: {},
      create: {
        month: rev.month,
        revenue: rev.revenue,
      },
    });
  });
}

export async function GET() {
  try {
    await prisma.$connect();
    // Выполнение всех операций в одной транзакции
    await client.$transaction([
        ...await seedUsers(),
        ...await seedCustomers(),
      ...await seedInvoices(),
      ...await seedRevenue(),
    ]);

    await client.$disconnect();
    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    await client.$disconnect();
  }
}
