'use server';

import { z } from 'zod';
import prisma from 'lib/prisma';
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce
        .number()
        .gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    }
    try {
        const { customerId, amount, status } = validatedFields.data;
        const amountInCents = amount * 100;
        console.log({
            customerId: customerId,
            amount: amountInCents,
            status: status,
            date: new Date(),
        });
        const newInvoice = await prisma.invoice.create({
            data: {
                customerId: customerId,
                amount: amountInCents,
                status: status,
                date: new Date(),
            },
        });

        // Test it out:
        console.log(newInvoice);
    }catch (e) {
        console.error(e , "Error creating Invoice");
        return {message: 'Error creating Invoice', error: e};
    } finally {
        prisma.$disconnect();
        revalidatePath('/dashboard/invoices');
        redirect('/dashboard/invoices');
    }

}


const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, prevState: State, formData: FormData) {

    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    }

    try {
        const { customerId, amount, status } = validatedFields.data;
        const amountInCents = amount * 100;
        let data = await prisma.invoice.update({
            where: {
                id: id,
            },
            data: {
                customerId: customerId,
                amount: amountInCents,
                status: status,
            },
        });
        console.log(data)
    }catch (e) {
        return {message: "Error updating Invoice"};
    } finally {
        prisma.$disconnect();
        revalidatePath('/dashboard/invoices');
        redirect('/dashboard/invoices');
    }
}

export async function deleteInvoice(id: string) {
    try {
        await prisma.invoice.delete({
            where: {
                id: id,
            }
        })
        revalidatePath('/dashboard/invoices');
        return { message: 'Deleted Invoice' };
    }catch (e) {
        console.log(e , "Error deleting Invoice");
        return { message: 'Database Error: Failed to Delete Invoice' };
    }finally {
        prisma.$disconnect();
    }
    // revalidatePath('/dashboard/invoices');
}