'use client';

import { useState, useEffect } from 'react';
import { createTask } from "../actions/createTask";
import CreatableSelect from 'react-select/creatable';
import { getAllTags } from '../actions/tag';

export function NewTaskForm({ users, currentUserRole }: { users: any[], currentUserRole?: string }) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        const formData = new FormData(e.currentTarget);
        const startDate = formData.get('startDate') as string;
        const dueDate = formData.get('dueDate') as string;

        if (startDate && dueDate) {
            if (new Date(startDate) > new Date(dueDate)) {
                e.preventDefault();
                alert('開始日は締切日より前の日付にしてください');
                return;
            }
        }
    };

    const [availableTags, setAvailableTags] = useState<{value: string, label: string}[]>([]);
    const [selectedTags, setSelectedTags] = useState<readonly {value: string, label: string}[]>([]);

    useEffect(() => {
        getAllTags().then(tags => {
            setAvailableTags(tags.map((t: any) => ({ value: t.name, label: t.name })));
        });
    }, []);

    return (
        <form action={createTask} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label>
                <span className="pixel-text">タスク名 <span style={{ color: 'var(--color-rust)' }}>*</span></span>
                <input
                    name="title"
                    required
                    style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--text-main)' }}
                />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label>
                    <span className="pixel-text">担当者</span>
                    <select
                        name="assigneeId"
                        style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--text-main)' }}
                    >
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </label>

                <label>
                    <span className="pixel-text">タスク種別</span>
                    <select
                        name="type"
                        defaultValue="TASK"
                        style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--text-main)', color: 'var(--text-main)' }}
                    >
                        <option value="TASK">通常タスク (TASK)</option>
                        <option value="BUG">異常・バグ (BUG)</option>
                    </select>
                </label>

                <label>
                    <span className="pixel-text">優先度</span>
                    <select
                        name="priority"
                        defaultValue="MIDDLE"
                        style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--text-main)', color: 'var(--text-main)' }}
                    >
                        <option value="LOW">低 (LOW)</option>
                        <option value="MIDDLE">中 (MIDDLE)</option>
                        <option value="HIGH">高 (HIGH)</option>
                    </select>
                </label>
                
                <label>
                    <span className="pixel-text">ロール (担当役割)</span>
                    <select
                        name="role"
                        defaultValue={currentUserRole || "PROGRAMMER"}
                        style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--text-main)', color: 'var(--text-main)' }}
                    >
                        <option value="PLANNER">プランナー</option>
                        <option value="PROGRAMMER">プログラマー</option>
                        <option value="DESIGNER">デザイナー</option>
                    </select>
                </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label>
                    <span className="pixel-text">開始日</span>
                    <input
                        type="date"
                        name="startDate"
                        style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--text-main)' }}
                    />
                </label>
                <label>
                    <span className="pixel-text">締切日</span>
                    <input
                        type="date"
                        name="dueDate"
                        style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--text-main)' }}
                    />
                </label>
            </div>

            <label>
                <span className="pixel-text">分類タグ (自由に作成・複数選択可)</span>
                <input type="hidden" name="tagsStr" value={JSON.stringify(selectedTags.map(t => t.value))} />
                <div style={{color: '#000'}}>
                    <CreatableSelect
                        isMulti
                        options={availableTags}
                        value={selectedTags}
                        onChange={(newValue) => setSelectedTags(newValue)}
                        placeholder="タグを選択または入力してEnter..."
                        noOptionsMessage={() => "タグが見つかりません"}
                        formatCreateLabel={(inputValue) => `「${inputValue}」を新規作成`}
                        styles={{
                            control: (base) => ({
                                ...base,
                                backgroundColor: 'var(--bg-sunken)',
                                borderColor: 'var(--text-main)',
                                borderWidth: '2px',
                                borderRadius: '0',
                                '&:hover': { borderColor: 'var(--text-main)' }
                            }),
                            menu: (base) => ({
                                ...base,
                                borderRadius: '0',
                                border: '2px solid var(--text-main)'
                            })
                        }}
                    />
                </div>
            </label>

            <label>
                <span className="pixel-text">詳細・メモ (Markdown対応)</span>
                <textarea
                    name="description"
                    rows={10}
                    placeholder="# 概要&#13;&#10;- ポイント1&#13;&#10;- ポイント2"
                    style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--text-main)' }}
                />
            </label>

            <button
                type="submit"
                className="hover:bg-[var(--color-moss-dark)] hover:text-[#000] transition-colors duration-200"
                style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    backgroundColor: '#000',
                    color: 'var(--color-moss-light)',
                    border: '2px solid var(--color-moss-dark)',
                    fontFamily: 'inherit',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                }}
            >
                [ {'>'} ] タスクをシステムに登録
            </button>
        </form>
    );
}
