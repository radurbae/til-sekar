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

// GET - List all articles
export async function GET(request: NextRequest) {
    try {
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

        // Get all files in content directory
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/content`,
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
                return NextResponse.json({ articles: [] });
            }
            throw new Error('Failed to fetch articles from GitHub');
        }

        const files = await response.json();

        // Filter only .md files and fetch their content
        const mdFiles = files.filter((f: { name: string }) => f.name.endsWith('.md'));

        const articles = await Promise.all(
            mdFiles.map(async (file: { name: string; sha: string; download_url: string }) => {
                const contentResponse = await fetch(file.download_url, { cache: 'no-store' });
                const content = await contentResponse.text();

                // Parse frontmatter
                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                if (!frontmatterMatch) {
                    return null;
                }

                const frontmatter = frontmatterMatch[1];
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

                return {
                    slug: file.name.replace('.md', ''),
                    sha: file.sha,
                    title: titleMatch ? titleMatch[1].trim() : file.name.replace('.md', ''),
                    date: dateMatch ? dateMatch[1] : 'Unknown',
                    category: categoryMatch ? categoryMatch[1] : 'General',
                    tags,
                };
            })
        );

        // Filter nulls and sort by date
        const validArticles = articles
            .filter(Boolean)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({ articles: validArticles });
    } catch (error) {
        console.error('Error fetching articles:', error);
        return NextResponse.json(
            { error: 'Failed to fetch articles' },
            { status: 500 }
        );
    }
}
