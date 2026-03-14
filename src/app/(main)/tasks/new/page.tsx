import { getUsers, getCurrentUser } from "../../../../actions/auth";
import { MossyFrame } from "../../../../components/ui/MossyFrame";
import { NewTaskForm } from "../../../../components/NewTaskForm";

export default async function NewTaskPage() {
    const allUsers = await getUsers();
    const currentUser = await getCurrentUser();
    const users = (allUsers || []).filter((u: any) => u.name !== 'Charmy' && u.username !== 'Charmy');

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <MossyFrame title="新規タスク作成">
                <NewTaskForm users={users} currentUserRole={currentUser?.role || 'PROGRAMMER'} />
            </MossyFrame>
        </div>
    );
}
