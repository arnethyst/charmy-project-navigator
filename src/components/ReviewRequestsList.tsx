'use client';

import { useState, useEffect } from 'react';
import { getMyReviewRequests } from '../actions/communications';
import { updateTaskStatus } from '../actions/task';
import { useRouter } from 'next/navigation';
import { StatusBadge } from './ui/StatusBadge';

export function ReviewRequestsList() {
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const loadRequests = async () => {
        setIsLoading(true);
        const result = await getMyReviewRequests();
        if (result.success) {
            setRequests(result.requests || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadRequests();
    }, []);

    if (isLoading) {
        return <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>LOADING REVIEW REQUESTS...</div>;
    }

    if (requests.length === 0) {
        return null; // Don't show the section if there are no requests
    }

    return (
        <div style={{
            border: '2px solid var(--color-flower)',
            padding: '1.5rem',
            position: 'relative',
            backgroundColor: 'rgba(230, 200, 250, 0.05)',
            marginBottom: '2rem'
        }}>
            <div style={{
                position: 'absolute',
                top: '-12px',
                left: '20px',
                backgroundColor: 'var(--bg-main)',
                padding: '0 10px',
                color: 'var(--color-flower)',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                fontSize: '0.9rem'
            }}>
                [ ☑️ 確認要請一覧 ]
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-flower)', marginBottom: '0.5rem' }}>
                    あなたに確認・レビューが依頼されているタスクです。詳細画面から確認し、完了させてください。
                </div>
                {requests.map(req => (
                    <div key={req.id}
                        onClick={() => router.push(`/tasks/${req.task.id}`)}
                        className="group"
                        style={{
                            border: '1px solid var(--color-flower)',
                            padding: '1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            backgroundColor: 'var(--bg-sunken)'
                        }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <StatusBadge status={req.task.status} />
                                <span style={{ fontWeight: 'bold' }}>{req.task.title}</span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                依頼者: {req.requester.name || req.requester.username}
                            </span>
                        </div>
                        {req.message && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', opacity: 0.9, padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.05)', borderLeft: '3px solid var(--color-flower)' }}>
                                &quot;{req.message}&quot;
                            </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            依頼日時: {new Date(req.createdAt).toLocaleString('ja-JP')}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
