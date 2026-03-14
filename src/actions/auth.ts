'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function login(userId: string, password?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return { error: 'User not found' };
    }

    if (password) {
        // Verify password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return { error: 'Invalid password' };
        }
    } else {
        // Fallback or safety check
        if (user.passwordHash && user.passwordHash.length > 0) {
            return { error: 'Password required' };
        }
    }

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('userId', user.id, {
        path: '/',
        maxAge: SESSION_DURATION,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
    });

    // We can't return from here if we redirect, but for server actions called from client 
    // we want to return success/error. 
    // However, if we redirect, the client component will see the redirect.
    // But if we want to return error, we shouldn't redirect.
    // The previous implementation used redirect. Current AuthForm expects { error } or void.
    // If successful, redirect throws.
    // Return success and redirect URL instead of redirecting immediately
    // to allow client-side animation to finish
    if (user.role === 'ADMIN') {
        return { success: true, redirectUrl: '/admin' };
    } else {
        return { success: true, redirectUrl: '/' };
    }
}

export async function signup(formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as string;
    const avatar = formData.get('avatar') as string;
    const themeColor = (formData.get('themeColor') as string) || '#00ff00';
    const passkey = formData.get('passkey') as string;

    const serverPasskey = process.env.PROJECT_PASSKEY || 'PCN001';
    if (passkey !== serverPasskey) {
        return { error: 'Invalid Project Passkey' };
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
        return { error: 'Username already taken' };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            username,
            name: username, // Default name to username
            passwordHash,
            role,
            avatar,
            themeColor
        }
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('userId', user.id, {
        path: '/',
        maxAge: SESSION_DURATION,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
    });

    // Return success and redirect URL instead of redirecting immediately
    // to allow client-side animation to finish
    if (user.role === 'ADMIN') {
        return { success: true, redirectUrl: '/admin' };
    } else {
        return { success: true, redirectUrl: '/' };
    }
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete('userId');
    redirect('/login');
}

export async function getUsers() {
    return await prisma.user.findMany({ select: { id: true, name: true, role: true, avatar: true, username: true, themeColor: true } });
}

export async function getCurrentUser() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    return user;
}
