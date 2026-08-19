"use client";

import { useEffect, useMemo, useState } from "react";
import { TilLanguage } from "@/lib/til";
import TilCard from "@/components/TilCard/TilCard";
import styles from "./TilList.module.css";

const PAGE_SIZE = 5;

export interface TilListItem {
    slug: string;
    title: string;
    excerpt: string;
    date: string;
    language: TilLanguage;
    category: string;
    tags: string[];
}

interface TilListProps {
    items: TilListItem[];
}

const LANGUAGE_OPTIONS: Array<"all" | TilLanguage> = ["all", "ID", "EN"];

export default function TilList({ items }: TilListProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedLanguage, setSelectedLanguage] = useState<"all" | TilLanguage>("all");
    const [currentPage, setCurrentPage] = useState(1);

    const categories = useMemo(() => {
        return [...new Set(items.map((item) => item.category))].sort((a, b) =>
            a.localeCompare(b, "id-ID")
        );
    }, [items]);

    const filteredItems = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return items.filter((item) => {
            const matchesQuery =
                !normalizedQuery ||
                `${item.title} ${item.excerpt} ${item.tags.join(" ")}`
                    .toLowerCase()
                    .includes(normalizedQuery);
            const matchesCategory =
                selectedCategory === "all" || item.category === selectedCategory;
            const matchesLanguage =
                selectedLanguage === "all" || item.language === selectedLanguage;

            return matchesQuery && matchesCategory && matchesLanguage;
        });
    }, [items, searchQuery, selectedCategory, selectedLanguage]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory, selectedLanguage]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredItems.slice(start, start + PAGE_SIZE);
    }, [filteredItems, currentPage]);

    const hasResults = filteredItems.length > 0;

    return (
        <>
            <div className={styles.controls}>
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className={styles.searchInput}
                    placeholder="Search posts..."
                    aria-label="Search posts"
                />

                <div className={styles.filters}>
                    <select
                        value={selectedLanguage}
                        onChange={(event) =>
                            setSelectedLanguage(event.target.value as "all" | TilLanguage)
                        }
                        className={styles.filterSelect}
                        aria-label="Filter by language"
                    >
                        {LANGUAGE_OPTIONS.map((language) => (
                            <option key={language} value={language}>
                                {language === "all" ? "All languages" : language}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedCategory}
                        onChange={(event) => setSelectedCategory(event.target.value)}
                        className={styles.filterSelect}
                        aria-label="Filter by category"
                    >
                        <option value="all">All categories</option>
                        {categories.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <p className={styles.resultText}>
                {hasResults
                    ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}-${(currentPage - 1) * PAGE_SIZE + paginatedItems.length} of ${filteredItems.length} posts`
                    : "No posts found"}
            </p>

            <div className={styles.list}>
                {paginatedItems.map((item) => (
                    <TilCard
                        key={item.slug}
                        slug={item.slug}
                        title={item.title}
                        excerpt={item.excerpt}
                        date={item.date}
                        language={item.language}
                        category={item.category}
                        tags={item.tags}
                    />
                ))}
            </div>

            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        className={styles.pageButton}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    <span className={styles.pageText}>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        type="button"
                        onClick={() =>
                            setCurrentPage((page) => Math.min(totalPages, page + 1))
                        }
                        className={styles.pageButton}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}
        </>
    );
}
