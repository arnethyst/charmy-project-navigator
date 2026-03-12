'use client';

import React, { useState, useEffect } from 'react';
import styles from './TypingGreeting.module.css';

interface TypingGreetingProps {
    name: string;
}

export const TypingGreeting = ({ name }: TypingGreetingProps) => {
    const fullText = `こんにちは、${name}さん`;
    const [displayedText, setDisplayedText] = useState('');
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (index < fullText.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + fullText[index]);
                setIndex(prev => prev + 1);
            }, 100);
            return () => clearTimeout(timeout);
        }
    }, [index, fullText]);

    return (
        <div className={styles.container}>
            <span className="pixel-text">{displayedText}</span>
            <span className={styles.cursor}>_</span>
        </div>
    );
};
