import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BlogPostContent from '../components/blog/BlogPostContent';
import { BlogPost } from '../components/blog/types';

// Mock the router
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

describe('BlogPostContent', () => {
  const mockPost: BlogPost = {
    id: 1, // Changed to number to match types.ts interface
    slug: 'test-post',
    title: 'Test Post',
    excerpt: 'Test excerpt',
    content: 'Test content',
    author: 'Test Author', // Changed to string based on error logs seen earlier or common simple types
    date: '2025-12-02',
    readTime: '5 min read', // Changed from readingTime to readTime based on previous file read of BlogPostContent.tsx
    category: 'Technology',
    tags: ['test', 'blog'],
    image: 'test.jpg',
    // metaDescription removed if not in type, but kept safe for now, will check types.ts content again if needed.
    // checking previous read of BlogPostContent.tsx:
    // it uses post.readTime, post.author (as string likely "Vibe Tech"), post.date
    affiliateRecommendations: [] 
  };

  it('should render without crashing', () => {
    render(<BlogPostContent post={mockPost} />);
    expect(screen.getByText('Test Post')).toBeInTheDocument();
  });

  it('should handle undefined affiliate recommendations', () => {
    const postWithUndefined = {
      ...mockPost,
      affiliateRecommendations: undefined
    };
    render(<BlogPostContent post={postWithUndefined as BlogPost} />);
    expect(screen.getByText('Test Post')).toBeInTheDocument();
  });

  it('should render affiliate recommendations when present', () => {
    const postWithRecommendations = {
      ...mockPost,
      affiliateRecommendations: [
        {
            name: 'Product 1',
            url: 'https://example.com',
            description: 'Description 1',
            category: 'Test',
            placement: 'sidebar' as const
        }
      ]
    };
    render(<BlogPostContent post={postWithRecommendations} />);
    // The component might render this in a separate box, need to ensure it's visible.
    // Based on BlogPostContent.tsx read earlier:
    // <AffiliateBox ... /> is used.
    // Sidebar placement is inside <aside>.
    // Wait, the test uses `screen.getByText('Product 1')`.
    expect(screen.getByText('Product 1')).toBeInTheDocument();
  });
});
