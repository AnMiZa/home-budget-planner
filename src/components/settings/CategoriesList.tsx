import { useCallback } from "react";
import { CategoryListItem } from "./CategoryListItem";
import { InfiniteScrollTrigger } from "@/components/ui/infinite-scroll-trigger";
import { PaginationControl } from "@/components/ui/pagination-control";
import type { CategoryVM } from "./types";
import type { PaginationMetaDto } from "@/types";

export interface CategoriesListProps {
  readonly categories: readonly CategoryVM[];
  readonly meta: PaginationMetaDto | null;
  readonly isLoadingMore: boolean;
  readonly onEdit: (category: CategoryVM) => void;
  readonly onDelete: (category: CategoryVM) => void;
  readonly onLoadMore: () => void;
  readonly onPageChange: (page: number) => void;
}

/**
 * List of categories with pagination support.
 * Uses infinite scroll on mobile and pagination controls on desktop.
 */
export const CategoriesList = ({
  categories,
  meta,
  isLoadingMore,
  onEdit,
  onDelete,
  onLoadMore,
  onPageChange,
}: CategoriesListProps) => {
  const hasMorePages = meta ? meta.page < meta.totalPages : false;

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMorePages) {
      onLoadMore();
    }
  }, [hasMorePages, isLoadingMore, onLoadMore]);

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {categories.map((category) => (
          <CategoryListItem key={category.id} category={category} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </ul>

      {/* Infinite scroll for mobile */}
      {hasMorePages && (
        <div className="md:hidden">
          <InfiniteScrollTrigger hasMore={hasMorePages} onLoadMore={handleLoadMore} isLoading={isLoadingMore} />
        </div>
      )}

      {/* Pagination for desktop */}
      {meta && meta.totalPages > 1 && (
        <div className="hidden md:block">
          <PaginationControl
            meta={meta}
            onPageChange={onPageChange}
            isBusy={isLoadingMore}
          />
        </div>
      )}
    </div>
  );
};

