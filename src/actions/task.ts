'use server';

import { cookies } from 'next/headers';
import prisma from '../lib/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';

export async function createTask(formData: FormData) {
    const user = await getCurrentUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const type = (formData.get('type') as string) || 'TASK';
    const status = (formData.get('status') as string) || 'TODO';
    const priority = (formData.get('priority') as string) || 'MIDDLE';
    const assigneeId = (formData.get('assigneeId') as string) || user.id;

    // Convert date string if present
    const dueDateStr = formData.get('dueDate') as string;
    let dueDate = null;
    if (dueDateStr) {
        dueDate = new Date(dueDateStr);
    }

    const roleInput = formData.get('role') as string;
    const role = ['PLANNER', 'PROGRAMMER', 'DESIGNER'].includes(roleInput) ? roleInput : 'PROGRAMMER';

    const tagsJson = formData.get('tagsStr') as string;
    let tagNames: string[] = [];
    try { if (tagsJson) tagNames = JSON.parse(tagsJson); } catch(e){}
    const tagsConnectOrCreate = tagNames.filter(n => n.trim() !== '').map(name => ({
        where: { name },
        create: { name }
    }));

    try {
        const newTask = await prisma.task.create({
            data: {
                title,
                description,
                type,
                status,
                priority,
                assigneeId,
                dueDate,
                progress: 0,
                role: role,
                tags: tagsConnectOrCreate.length > 0 ? { connectOrCreate: tagsConnectOrCreate } : undefined,
            },
        });

        // 担当者の情報を取得 (通知メッセージ用)
        const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
        const creatorName = user.name || user.username;
        const assigneeName = assignee?.name || assignee?.username || '担当者';

        // ログ記録 (対象を担当者に設定)
        await prisma.systemLog.create({
            data: {
                taskId: newTask.id,
                userId: assigneeId,
                content: `${creatorName} さんが ${assigneeName} さんへ新たなタスク『${newTask.title}』を生成しました。`,
            }
        });

        revalidatePath('/my-tasks');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to create task:', error);
        console.error('Detailed error:', error?.message);
        return { error: 'Failed to create task: ' + (error?.message || String(error)) };
    }
}

export async function getMyTasks() {
    const user = await getCurrentUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    try {
        const tasks = await prisma.task.findMany({
            where: {
                assigneeId: user.id,
            },
            orderBy: {
                updatedAt: 'desc',
            },
            include: {
                assignee: {
                    select: { name: true, username: true, avatar: true, themeColor: true }
                },
                tags: true
            }
        });
        return { success: true, tasks };
    } catch (error) {
        console.error('Failed to fetch tasks:', error);
        return { error: 'Failed to fetch tasks' };
    }
}

export async function getProjectTasks() {
    try {
        const tasks = await prisma.task.findMany({
            orderBy: {
                updatedAt: 'desc',
            },
            include: {
                assignee: {
                    select: { name: true, username: true, avatar: true, themeColor: true }
                },
                tags: true
            }
        });
        return tasks;
    } catch (error) {
        console.error('Failed to fetch project tasks:', error);
        return [];
    }
}

export async function getDashboardTasks(userId: string) {
    try {
        // Fetch all tasks for the user to sort into categories
        // Or fetch specific categories directly.
        // Dashboard needs: Focus (High prio/Due soon), Working (In Progress), Stuck (Review)

        const tasks = await prisma.task.findMany({
            where: {
                assigneeId: userId,
                status: { not: 'DONE' }
            },
            include: {
                assignee: {
                    select: { name: true, username: true, avatar: true, themeColor: true }
                },
                tags: true
            }
        });

        const focusTasks = tasks.filter(t => t.priority === 'HIGH' || (t.dueDate && new Date(t.dueDate) < new Date(Date.now() + 86400000 * 3)));
        const workingTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
        const stuckTasks = tasks.filter(t => t.status === 'REVIEW');

        return { focusTasks, workingTasks, stuckTasks };


    } catch (error) {
        console.error('Failed to fetch dashboard tasks:', error);
        return { focusTasks: [], workingTasks: [], stuckTasks: [] };
    }
}

export async function updateTaskStatus(taskId: string, newStatus: string) {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('Unauthorized');
    }

    try {
        const oldTask = await prisma.task.findUnique({ where: { id: taskId } });
        if (!oldTask) throw new Error('Task not found');

        await prisma.task.update({
            where: {
                id: taskId,
            },
            data: {
                status: newStatus,
            },
        });

        if (oldTask.status !== newStatus) {
            await prisma.systemLog.create({
                data: {
                    taskId: taskId,
                    userId: user.id,
                    content: `${user.name || user.username} が 「${oldTask.title}」のステータスを ${oldTask.status} から ${newStatus} に変更しました`,
                }
            });
        }

        revalidatePath('/kanban');
        revalidatePath('/my-tasks');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to update task status:', error);
        throw new Error('Failed to update task status');
    }
}

export async function updateTaskDates(taskId: string, startDate: Date | string | null, dueDate: Date | string | null) {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('Unauthorized');
    }

    try {
        const oldTask = await prisma.task.findUnique({ where: { id: taskId } });
        if (!oldTask) throw new Error('Task not found');

        const newStartDate = startDate ? new Date(startDate) : null;
        const newDueDate = dueDate ? new Date(dueDate) : null;

        await prisma.task.update({
            where: { id: taskId },
            data: {
                startDate: newStartDate,
                dueDate: newDueDate,
            },
        });

        // ログ生成の判定 (dueDateだけの変更を優先してログにするか、両方か)
        const formatMd = (d: Date | null) => d ? `${d.getMonth()+1}/${d.getDate()}` : '未定';
        const oldDueStr = formatMd(oldTask.dueDate);
        const newDueStr = formatMd(newDueDate);
        
        if (oldDueStr !== newDueStr) {
            await prisma.systemLog.create({
                data: {
                    taskId: taskId,
                    userId: user.id,
                    content: `${user.name || user.username} が 「${oldTask.title}」の期限を ${newDueStr} に変更しました`,
                }
            });
        }

        revalidatePath('/gantt');
        revalidatePath(`/tasks/${taskId}`);
        return { success: true };
    } catch (error: any) {
        console.error('Failed to update task dates:', error);
        return { error: error.message || 'Failed to update task dates' };
    }
}

export async function getTask(id: string) {
    try {
        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                assignee: {
                    select: { name: true, username: true, avatar: true, themeColor: true }
                },
                milestone: true,
                tags: true
            }
        });
        return task;
    } catch (error) {
        console.error('Failed to fetch task:', error);
        return null;
    }
}

export async function updateTask(taskId: string, data: any) {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('Unauthorized');
    }

    try {
        let updateData = { ...data };
        
        // Tagsの更新（既存をリセットして新しくセットする）
        if (data.tagsStr !== undefined) {
            let tagNames: string[] = [];
            try { if (data.tagsStr) tagNames = JSON.parse(data.tagsStr); } catch(e){}
            const validNames = tagNames.filter(n => n.trim() !== '');
            
            updateData.tags = {
                set: [], // 一度クリア
                connectOrCreate: validNames.map(name => ({
                    where: { name },
                    create: { name }
                }))
            };
            delete updateData.tagsStr;
        }

        // ロールのバリデーション
        if (updateData.role && !['PLANNER', 'PROGRAMMER', 'DESIGNER'].includes(updateData.role)) {
            updateData.role = 'PROGRAMMER';
        }

        const oldTask = await prisma.task.findUnique({ where: { id: taskId } });
        if (!oldTask) throw new Error('Task not found');

        await prisma.task.update({
            where: {
                id: taskId,
            },
            data: updateData,
        });

        // If task is completed, also mark all pending review requests as APPROVED
        if (updateData.status === 'DONE') {
            await prisma.reviewRequest.updateMany({
                where: {
                    taskId,
                    status: 'PENDING'
                },
                data: {
                    status: 'APPROVED'
                }
            });
        }

        // 内容の変更を検知してログ生成
        let logMessage = '';
        let targetUserId = oldTask.assigneeId;

        if (updateData.assigneeId && updateData.assigneeId !== oldTask.assigneeId) {
            // 担当者が変更された場合
            const newAssignee = await prisma.user.findUnique({ where: { id: updateData.assigneeId } });
            const updaterName = user.name || user.username;
            const newAssigneeName = newAssignee?.name || newAssignee?.username || '担当者';
            logMessage = `${updaterName} さんが、タスク『${oldTask.title}』の担当者を ${newAssigneeName} さんに変更しました。`;
            targetUserId = updateData.assigneeId; // 新しい担当者に通知
        } else if (updateData.status && updateData.status !== oldTask.status) {
            logMessage = `${user.name || user.username} が 「${oldTask.title}」のステータスを ${oldTask.status} から ${updateData.status} に変更しました`;
        } else if (updateData.role && updateData.role !== oldTask.role) {
            logMessage = `${user.name || user.username} が 「${oldTask.title}」のロールを ${oldTask.role} から ${updateData.role} に変更しました`;
        } else if (updateData.dueDate !== undefined) {
             const formatMd = (d: Date | null) => d ? `${d.getMonth()+1}/${d.getDate()}` : '未定';
             const oldDueStr = formatMd(oldTask.dueDate);
             const newDueStr = formatMd(updateData.dueDate ? new Date(updateData.dueDate) : null);
             if (oldDueStr !== newDueStr) {
                 logMessage = `${user.name || user.username} が 「${oldTask.title}」の期限を ${newDueStr} に変更しました`;
             } else {
                 logMessage = `${user.name || user.username} が 「${oldTask.title}」の内容を更新しました`;
             }
        } else {
            logMessage = `${user.name || user.username} が 「${oldTask.title}」の内容を更新しました`;
        }

        if (logMessage && targetUserId) {
            await prisma.systemLog.create({
                data: {
                    taskId: taskId,
                    userId: targetUserId,
                    content: logMessage,
                }
            });
        }

        revalidatePath(`/tasks/${taskId}`, 'page');
        revalidatePath('/my-tasks');
        revalidatePath('/kanban');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to update task:', error);
        return { error: 'Failed to update task' };
    }
}

export async function deleteTask(taskId: string) {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('Unauthorized');
    }

    try {
        await prisma.task.delete({
            where: {
                id: taskId,
            },
        });
        revalidatePath('/my-tasks');
        revalidatePath('/kanban');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete task:', error);
        return { error: 'Failed to delete task' };
    }
}

export async function getMySystemLogs() {
    const user = await getCurrentUser();
    if (!user) return [];

    try {
        const logs = await prisma.systemLog.findMany({
            where: {
                OR: [
                    { userId: user.id }, // 自分が実行したアクション
                    {
                        task: {
                            assigneeId: user.id // 自分が担当しているタスクのアクション
                        }
                    }
                ]
            },
            take: 20, // 最新20件
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                task: { select: { id: true, title: true } }
            }
        });
        return logs;
    } catch (error) {
        console.error('Failed to fetch personal system logs:', error);
        return [];
    }
}

export async function getUnreadSystemLogsCount() {
    const user = await getCurrentUser();
    if (!user) return 0;

    try {
        const count = await prisma.systemLog.count({
            where: {
                isRead: false,
                OR: [
                    { userId: user.id }, // 自分が実行したアクション
                    {
                        task: {
                            assigneeId: user.id // 自分が担当しているタスクのアクション
                        }
                    }
                ]
            }
        });
        return count;
    } catch (error) {
        console.error('Failed to get unread system logs count:', error);
        return 0;
    }
}

export async function markSystemLogsAsRead() {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
        await prisma.systemLog.updateMany({
            where: {
                isRead: false,
                OR: [
                    { userId: user.id },
                    {
                        task: {
                            assigneeId: user.id
                        }
                    }
                ]
            },
            data: {
                isRead: true
            }
        });

        // Revalidate layout to ensure sidebar badges update everywhere
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        console.error('Failed to mark system logs as read:', error);
        return { success: false, error: 'Failed to update system logs' };
    }
}

export async function markTaskSystemLogsAsRead(taskId: string) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
        await prisma.systemLog.updateMany({
            where: {
                userId: user.id,
                taskId: taskId,
                isRead: false
            },
            data: {
                isRead: true
            }
        });

        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        console.error('Failed to mark specific task system logs as read:', error);
        return { success: false, error: 'Failed to update system logs' };
    }
}
