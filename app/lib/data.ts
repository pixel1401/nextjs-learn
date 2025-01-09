import {sql} from '@vercel/postgres';
import prisma from '@/lib/prisma';
import {CustomersTableType,} from './definitions';
import {formatCurrency} from './utils';

export async function fetchRevenue() {
  try {

    // Задержка для демонстрации (не делайте это в продакшене)
    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Получение всех записей из таблицы revenue
    const data = await prisma.revenue.findMany();

    console.log('Data fetch completed after 3 seconds.');

    return data; // Возвращает массив объектов
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  } finally {
    await prisma.$disconnect();
  }
}

export async function fetchLatestInvoices() {
  try {
    // Получаем последние 5 счетов с информацией о клиентах
    const invoices = await prisma.invoice.findMany({
      orderBy: {
        date: 'desc', // Сортировка по убыванию даты
      },
      take: 5, // Лимит в 5 записей
      include: {
        customer: true, // Включение данных о клиенте
      },
    });

    // Приводим данные к нужному формату
    return invoices.map((invoice) => ({
      id: invoice.id,
      amount: formatCurrency(invoice.amount),
      name: invoice.customer.name,
      email: invoice.customer.email,
      image_url: invoice.customer.image_url,
    }));
  } catch (error) {
    console.error('Database Error:', error);
    return {message: 'Failed to fetch revenue data.'};
  } finally {
    await prisma.$disconnect();
  }
}

export async function fetchCardData() {
  try {
    // Выполняем параллельные запросы к базе данных
    const [invoiceCount, customerCount, invoiceStatus] = await Promise.all([
      prisma.invoice.count(), // Подсчёт количества записей в таблице invoices
      prisma.customer.count(), // Подсчёт количества записей в таблице customers
      prisma.invoice.groupBy({
        by: ['status'],
        _sum: {
          amount: true,
        },
      }), // Группируем данные по статусу и суммируем amounts
    ]);

    // Преобразуем данные по статусам
    const paidInvoices = invoiceStatus.find((status) => status.status === 'paid')?._sum.amount ?? 0;
    const pendingInvoices = invoiceStatus.find((status) => status.status === 'pending')?._sum.amount ?? 0;

    // Приводим данные к нужному формату
    const totalPaidInvoices = formatCurrency(paidInvoices);
    const totalPendingInvoices = formatCurrency(pendingInvoices);

    // Возвращаем данные в формате
    return {
      numberOfCustomers: customerCount,
      numberOfInvoices: invoiceCount,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  } finally {
    await prisma.$disconnect();
  }
}

const ITEMS_PER_PAGE = 6;

export async function fetchFilteredInvoices(query, currentPage) {
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    // Выполняем фильтрацию с использованием OR условий
    const invoices = await prisma.invoice.findMany({
      skip,
      take: ITEMS_PER_PAGE,
      orderBy: {
        date: 'desc',
      },
      where: {
        OR: [
          {
            customer: {
              name: {
                contains: query,
                mode: 'insensitive', // Регистронезависимый поиск
              },
            },
          },
          {
            customer: {
              email: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
          {
            amount: {
              equals: isNaN(Number(query)) ? undefined : Number(query),
            },
          },
          {
            date: {
              equals: isNaN(Date.parse(query)) ? undefined : new Date(query),
            },
          },
          {
            status: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
            image_url: true,
          },
        },
      },
    });

    // Форматируем результат
    return invoices.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount,
      date: invoice.date,
      status: invoice.status,
      name: invoice.customer.name,
      email: invoice.customer.email,
      image_url: invoice.customer.image_url,
    }));
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  } finally {
    await prisma.$disconnect();
  }
}

export async function fetchInvoicesPages(query) {
  try {
    // Считаем общее количество записей, подходящих под фильтр
    const totalCount = await prisma.invoice.count({
      where: {
        OR: [
          {
            customer: {
              name: {
                contains: query,
                mode: 'insensitive', // Регистронезависимый поиск
              },
            },
          },
          {
            customer: {
              email: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
          {
            amount: {
              equals: !isNaN(Number(query)) ? Number(query) : undefined,
            },
          },
          {
            date: {
              equals: !isNaN(Date.parse(query)) ? new Date(query) : undefined,
            },
          },
          {
            status: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
    });

    // Вычисляем общее количество страниц
    return Math.ceil(totalCount / ITEMS_PER_PAGE);
  } catch (error) {
    console.error('Database Error:', error);
    return {message: 'Failed to fetch invoices.'};
  } finally {
    await prisma.$disconnect();
  }
}

export async function fetchInvoiceById(id) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        customerId: true,
        amount: true,
        status: true,
      },
    });

    if (!invoice) {
      return null;
    }

    // Преобразуем сумму из центов в доллары
    return {
      ...invoice,
      amount: invoice.amount / 100,
    };
  } catch (error) {
    console.error('Database Error:', error);
    return { message: 'Database Error: Failed to Get by Id Invoice' };
  } finally {
    await prisma.$disconnect();
  }
}

export async function fetchCustomers() {
  try {
    // Получаем список клиентов, сортируя их по имени
    return await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc', // Сортировка по имени в порядке возрастания
      },
    });
  } catch (err) {
    console.error('Database Error:', err);
    return {message: 'Failed to fetch customers.'};
  } finally {
    await prisma.$disconnect();
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
