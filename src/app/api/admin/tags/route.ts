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

// GET - List all tags with article count
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
                return NextResponse.json({ tags: [] });
            }
            throw new Error('Failed to fetch content from GitHub');
        }

        const files = await response.json();
        const mdFiles = files.filter((f: { name: string }) => f.name.endsWith('.md'));

        // Count tags
        const tagCount: Record<string, number> = {};

        await Promise.all(
            mdFiles.map(async (file: { download_url: string }) => {
                const contentResponse = await fetch(file.download_url, { cache: 'no-store' });
                const content = await contentResponse.text();

                // Parse tags
                const tagsMatch = content.match(/tags:\n((?:\s+-\s+.+\n?)*)/);
                if (tagsMatch) {
                    const tagLines = tagsMatch[1].match(/\s+-\s+(.+)/g);
                    if (tagLines) {
                        tagLines.forEach(line => {
                            const tag = line.replace(/\s+-\s+/, '').trim();
                            if (tag) {
                                tagCount[tag] = (tagCount[tag] || 0) + 1;
                            }
                        });
                    }
                }
            })
        );

        // Convert to array format
        const tags = Object.entries(tagCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        return NextResponse.json({ tags });
    } catch (error) {
        console.error('Error fetching tags:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tags' },
            { status: 500 }
        );
    }
}
