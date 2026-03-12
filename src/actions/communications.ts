'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, getUsers } from './auth';
import { updateTaskStatus } from './task';

// --- Notifications ---

export async function getNotifications() {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                actor: { select: { name: true, username: true, themeColor: true } },
                task: { select: { title: true } }
            }
        });
        return { success: true, notifications };
    } catch (error) {
        console.error('Failed to get notifications', error);
        return { success: false, error: 'Failed to fetch notifications' };
    }
}

export async function markNotificationsAsRead() {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
        await prisma.notification.updateMany({
            where: { userId: user.id, isRead: false },
            data: { isRead: true }
        });
        revalidatePath('/my-tasks');
        return { success: true };
    } catch (error) {
        console.error('Failed to mark notifications as read', error);
        return { success: false, error: 'Failed to update notifications' };
    }
}

// --- Review Requests ---

export async function createReviewRequest(taskId: string, reviewerIds: string[], message?: string) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
        // Create review requests for each reviewer safely
        const requests = await Promise.all(
            reviewerIds.map(reviewerId =>
                prisma.reviewRequest.create({
                    data: {
                        taskId,
                        reviewerId,
                        requesterId: user.id,
                        message,
                        status: 'PENDING'
                    }
                })
            )
        );

        // Notify reviewers
        await Promise.all(
            reviewerIds.map(reviewerId =>
                prisma.notification.create({
                    data: {
                        userId: reviewerId,
                        actorId: user.id,
                        taskId,
                        type: 'REVIEW_REQUEST',
                        content: message ? `確認依頼: ${message}` : '確認依頼が届きました'
                    }
                })
            )
        );

        // Update task status to REVIEW
        await updateTaskStatus(taskId, 'REVIEW');

        revalidatePath('/my-tasks');
        revalidatePath('/kanban');
        revalidatePath(`/tasks/${taskId}`, 'page');

        return { success: true, requests };
    } catch (error: any) {
        console.error('Failed to create review request', error);
        return { success: false, error: error.message };
    }
}

export async function getMyReviewRequests() {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
        const requests = await prisma.reviewRequest.findMany({
            where: { reviewerId: user.id, status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            include: {
                task: { select: { id: true, title: true, status: true, priority: true } },
                requester: { select: { name: true, username: true, themeColor: true } }
            }
        });
        return { success: true, requests };
    } catch (error) {
        console.error('Failed to fetch review requests', error);
        return { success: false, error: 'Failed to fetch' };
    }
}

// --- Comments & Mentions ---

export async function getTaskComments(taskId: string) {
    try {
        const comments = await prisma.comment.findMany({
            where: { taskId },
            orderBy: { createdAt: 'asc' },
            include: {
                author: { select: { id: true, name: true, username: true, themeColor: true, avatar: true } }
            }
        });
        return { success: true, comments };
    } catch (error) {
        console.error('Failed to fetch comments', error);
        return { success: false, error: 'Failed to fetch' };
    }
}

export async function addComment(taskId: string, content: string) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
        const comment = await prisma.comment.create({
            data: {
                taskId,
                content,
                authorId: user.id
            },
            include: {
                author: { select: { id: true, name: true, username: true, themeColor: true, avatar: true } }
            }
        });

        // Mentions parsing
        const users = await getUsers();
        const mentionedUsers = users.filter((u: any) => {
            const usernameRegex = new RegExp(`@${u.username}`, 'i');
            const nameRegex = u.name ? new RegExp(`@${u.name}`, 'i') : null;
            return usernameRegex.test(content) || (nameRegex && nameRegex.test(content));
        });

        // Ensure we find the task assignee to notify them (if they aren't the author)
        const task = await prisma.task.findUnique({ where: { id: taskId } });

        const notifyTargets = new Set<string>();

        // Add mentioned users
        mentionedUsers.forEach((u: any) => notifyTargets.add(u.id));

        // Add assignee if someone else commented
        if (task && task.assigneeId && task.assigneeId !== user.id) {
            notifyTargets.add(task.assigneeId);
        }

        // Remove author from notify list
        notifyTargets.delete(user.id);

        // Send notifications
        const authorName = user.name || user.username;
        await Promise.all(
            Array.from(notifyTargets).map(targetId => {
                const isMentioned = mentionedUsers.some((u: any) => u.id === targetId);
                return prisma.notification.create({
                    data: {
                        userId: targetId,
                        actorId: user.id,
                        taskId,
                        type: isMentioned ? 'MENTION' : 'COMMENT',
                        content: isMentioned 
                            ? `${authorName} さんがあなたをメンションしました` 
                            : `タスク『${task?.title}』にコメントがつきました`
                    }
                });
            })
        );

        // System Log Generation for Comment
        if (task && task.assigneeId && task.assigneeId !== user.id) {
            await prisma.systemLog.create({
                data: {
                    taskId: task.id,
                    userId: task.assigneeId,
                    content: `「${task.title}」に ${user.name || user.username} さんからコメントが届きました`,
                }
            });
        }

        revalidatePath(`/tasks/${taskId}`, 'page');
        revalidatePath('/my-tasks');
        return { success: true, comment };
    } catch (error) {
        console.error('Failed to add comment', error);
        return { success: false, error: 'Failed to post comment' };
    }
}
