import { NextRequest, NextResponse } from 'next/server';

// Helper to verify password
function verifyPassword(password: string): boolean {
    return password === (process.env.ADMIN_PASSWORD || 'savinasekardita');
}

// Helper to get GitHub config
function getGitHubConfig() {
    return {
        token: process.env.GITHUB_TOKEN,
        owner: process.env.GITHUB_REPO_OWNER || 'radurbae',
        repo: process.env.GITHUB_REPO_NAME || 'til_rads',
    };
}

interface RouteParams {
    params: Promise<{ slug: string }>;
}

// GET - Get single article by slug
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const password = request.headers.get('x-admin-password');

        if (!password || !verifyPassword(password)) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { token, owner, repo } = getGitHubConfig();

        if (!token) {
            return NextResponse.json(
                { error: 'GitHub token not configured' },
                { status: 500 }
            );
        }

        const filePath = `content/${slug}.md`;
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
                cache: 'no-store',
            }
        );

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json(
                    { error: 'Article not found' },
                    { status: 404 }
                );
            }
            throw new Error('Failed to fetch article');
        }

        const data = await response.json();
        const content = Buffer.from(data.content, 'base64').toString('utf-8');

        // Parse frontmatter and content
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
        if (!frontmatterMatch) {
            return NextResponse.json(
                { error: 'Invalid article format' },
                { status: 400 }
            );
        }

        const frontmatter = frontmatterMatch[1];
        const articleContent = frontmatterMatch[2];

        const titleMatch = frontmatter.match(/title:\s*"?([^"\n]+)"?/);
        const dateMatch = frontmatter.match(/date:\s*(\S+)/);
        const categoryMatch = frontmatter.match(/category:\s*(\S+)/);

        // Parse tags
        const tagsMatch = frontmatter.match(/tags:\n((?:\s+-\s+.+\n?)*)/);
        const tags: string[] = [];
        if (tagsMatch) {
            const tagLines = tagsMatch[1].match(/\s+-\s+(.+)/g);
            if (tagLines) {
                tagLines.forEach(line => {
                    const tag = line.replace(/\s+-\s+/, '').trim();
                    if (tag) tags.push(tag);
                });
            }
        }

        return NextResponse.json({
            slug,
            sha: data.sha,
            title: titleMatch ? titleMatch[1].trim() : slug,
            date: dateMatch ? dateMatch[1] : 'Unknown',
            category: categoryMatch ? categoryMatch[1] : 'General',
            tags,
            content: articleContent,
        });
    } catch (error) {
        console.error('Error fetching article:', error);
        return NextResponse.json(
            { error: 'Failed to fetch article' },
            { status: 500 }
        );
    }
}

// PUT - Update article
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const body = await request.json();
        const { title, category, tags, content, password, sha } = body;

        if (!password || !verifyPassword(password)) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!title || !content || !sha) {
            return NextResponse.json(
                { error: 'Title, content and sha are required' },
                { status: 400 }
            );
        }

        const { token, owner, repo } = getGitHubConfig();

        if (!token) {
            return NextResponse.json(
                { error: 'GitHub token not configured' },
                { status: 500 }
            );
        }

        // Get current file to preserve date
        const currentResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/content/${slug}.md`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            }
        );

        let originalDate = new Date().toISOString().split('T')[0];
        if (currentResponse.ok) {
            const currentData = await currentResponse.json();
            const currentContent = Buffer.from(currentData.content, 'base64').toString('utf-8');
            const dateMatch = currentContent.match(/date:\s*(\S+)/);
            if (dateMatch) {
                originalDate = dateMatch[1];
            }
        }

        // Normalize category
        const normalizedCategory = category
            ? category.trim().split(' ').map((word: string) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ')
            : 'TIL';

        // Create frontmatter
        const tagsArray = typeof tags === 'string'
            ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
            : (tags || ['til']);

        const frontmatter = `---
title: "${title}"
date: ${originalDate}
category: ${normalizedCategory}
tags:
${tagsArray.map((t: string) => `  - ${t}`).join('\n')}
---

${content}`;

        const filePath = `content/${slug}.md`;
        const fileContent = Buffer.from(frontmatter).toString('base64');

        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json',
                },
                body: JSON.stringify({
                    message: `Update article: ${title}`,
                    content: fileContent,
                    sha: sha,
                    branch: 'main',
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('GitHub API error:', error);
            return NextResponse.json(
                { error: 'Failed to update article on GitHub' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Article updated successfully!',
        });
    } catch (error) {
        console.error('Error updating article:', error);
        return NextResponse.json(
            { error: 'Failed to update article' },
            { status: 500 }
        );
    }
}

// DELETE - Delete article
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const body = await request.json();
        const { password, sha } = body;

        if (!password || !verifyPassword(password)) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!sha) {
            return NextResponse.json(
                { error: 'SHA is required' },
                { status: 400 }
            );
        }

        const { token, owner, repo } = getGitHubConfig();

        if (!token) {
            return NextResponse.json(
                { error: 'GitHub token not configured' },
                { status: 500 }
            );
        }

        const filePath = `content/${slug}.md`;

        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json',
                },
                body: JSON.stringify({
                    message: `Delete article: ${slug}`,
                    sha: sha,
                    branch: 'main',
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('GitHub API error:', error);
            return NextResponse.json(
                { error: 'Failed to delete article on GitHub' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Article deleted successfully!',
        });
    } catch (error) {
        console.error('Error deleting article:', error);
        return NextResponse.json(
            { error: 'Failed to delete article' },
            { status: 500 }
        );
    }
}
