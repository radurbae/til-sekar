import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type TilLanguage = "ID" | "EN";

export interface TilData {
    slug: string;
    title: string;
    excerpt: string;
    date: string;
    language: TilLanguage;
    category: string;
    tags: string[];
    content: string;
}

const contentDirectory = path.join(process.cwd(), "content");

function normalizeLanguage(rawLanguage: string): TilLanguage | null {
    const normalized = rawLanguage.trim().toLowerCase();
    if (["id", "indonesian", "indonesia", "bahasa indonesia"].includes(normalized)) {
        return "ID";
    }
    if (["en", "english"].includes(normalized)) {
        return "EN";
    }
    return null;
}

function countMatches(text: string, pattern: RegExp): number {
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
}

function inferLanguage(content: string, rawLanguage: unknown): TilLanguage {
    if (typeof rawLanguage === "string") {
        const normalized = normalizeLanguage(rawLanguage);
        if (normalized) {
            return normalized;
        }
    }

    const lowercase = content.toLowerCase();
    const idScore = countMatches(
        lowercase,
        /\b(yang|dan|di|ke|dari|untuk|dengan|adalah|tidak|ini|itu|pada|karena|sebagai|dalam)\b/g
    );
    const enScore = countMatches(
        lowercase,
        /\b(the|and|to|of|in|is|for|that|with|this|are|be|have|it|as|from|on)\b/g
    );

    return idScore >= enScore ? "ID" : "EN";
}

export function getAllTils(): TilData[] {
    // Check if content directory exists
    if (!fs.existsSync(contentDirectory)) {
        return [];
    }

    const fileNames = fs.readdirSync(contentDirectory);
    const allTils = fileNames
        .filter((fileName) => fileName.endsWith(".md"))
        .map((fileName) => {
            const slug = fileName.replace(/\.md$/, "");
            const fullPath = path.join(contentDirectory, fileName);
            const fileContents = fs.readFileSync(fullPath, "utf8");
            const { data, content } = matter(fileContents);

            // Generate excerpt from content (first 150 chars)
            const excerpt =
                data.excerpt ||
                content.replace(/[#*`\n]/g, " ").trim().slice(0, 150) + "...";
            const language = inferLanguage(content, data.language);

            return {
                slug,
                title: data.title || slug,
                excerpt,
                date: data.date
                    ? new Date(data.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                    })
                    : "Unknown",
                language,
                category: data.category || "General",
                tags: data.tags || [],
                content,
            } as TilData;
        });

    // Sort by date (newest first)
    return allTils.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
}

export function getTilBySlug(slug: string): TilData | null {
    const fullPath = path.join(contentDirectory, `${slug}.md`);

    if (!fs.existsSync(fullPath)) {
        return null;
    }

    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    const excerpt =
        data.excerpt ||
        content.replace(/[#*`\n]/g, " ").trim().slice(0, 150) + "...";
    const language = inferLanguage(content, data.language);

    return {
        slug,
        title: data.title || slug,
        excerpt,
        date: data.date
            ? new Date(data.date).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
            })
            : "Unknown",
        language,
        category: data.category || "General",
        tags: data.tags || [],
        content,
    };
}

export function getAllSlugs(): string[] {
    if (!fs.existsSync(contentDirectory)) {
        return [];
    }

    return fs
        .readdirSync(contentDirectory)
        .filter((fileName) => fileName.endsWith(".md"))
        .map((fileName) => fileName.replace(/\.md$/, ""));
}

export function getAllTilDates(): string[] {
    if (!fs.existsSync(contentDirectory)) {
        return [];
    }

    const fileNames = fs.readdirSync(contentDirectory);
    const dates = fileNames
        .filter((fileName) => fileName.endsWith(".md"))
        .map((fileName) => {
            const fullPath = path.join(contentDirectory, fileName);
            const fileContents = fs.readFileSync(fullPath, "utf8");
            const { data } = matter(fileContents);
            if (data.date) {
                const dateObj = new Date(data.date);
                if (!isNaN(dateObj.getTime())) {
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
                    const day = String(dateObj.getDate()).padStart(2, "0");
                    return `${year}-${month}-${day}`;
                }
            }
            return null;
        })
        .filter((date): date is string => date !== null);

    return Array.from(new Set(dates)).sort();
}

