import React, { useEffect, useRef } from 'react';

/**
 * InfiniteScroll Component
 * Wraps list content and automatically calls onLoadMore when the bottom is scrolled into view.
 */
const InfiniteScroll = ({ hasMore, loading, onLoadMore, children }) => {
  const observerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Trigger load more if intersecting, has more content, and not currently loading
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      {
        root: null, // relative to viewport
        rootMargin: '100px', // fetch content early before the user reaches the bottom
        threshold: 0.1,
      }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loading, onLoadMore]);

  return (
    <>
      {children}
      {hasMore && (
        <div
          ref={observerRef}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem',
            width: '100%',
          }}
        >
          {loading && <div className="spinner"></div>}
        </div>
      )}
    </>
  );
};

export default InfiniteScroll;
