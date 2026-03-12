import { getProjectTasks } from "@/actions/task";
import { getUsers, getCurrentUser } from "@/actions/auth";
import { KanbanBoard } from "@/components/KanbanBoard";

export const dynamic = 'force-dynamic';

export default async function KanbanPage() {
    const tasks = await getProjectTasks();
    const users = await getUsers();
    const currentUser = await getCurrentUser();

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h1 className="pixel-text" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                タスクボード
            </h1>
            <KanbanBoard initialTasks={tasks} users={users} currentUser={currentUser} />
        </div>
    );
}
