"use client";

import Link from "next/link";
import styles from "./Header.module.css";

export default function Header() {
    return (
        <header className={styles.header}>
            <div className={`container ${styles.headerContent}`}>
                <Link href="/" className={styles.logo}>
                    TIL
                </Link>
                <nav className={styles.nav} aria-label="Primary">
                    <Link href="/categories" className={styles.navLink}>
                        Categories
                    </Link>
                    <Link href="/about" className={styles.navLink}>
                        About
                    </Link>
                </nav>
            </div>
        </header>
    );
}
