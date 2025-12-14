import { useCallback } from "react";
import { HouseholdMemberListItem } from "./HouseholdMemberListItem";
import { InfiniteScrollTrigger } from "@/components/ui/infinite-scroll-trigger";
import { PaginationControl } from "@/components/ui/pagination-control";
import type { HouseholdMemberVM } from "./types";
import type { PaginationMetaDto } from "@/types";

export interface HouseholdMembersListProps {
  readonly members: readonly HouseholdMemberVM[];
  readonly meta: PaginationMetaDto | null;
  readonly isLoadingMore: boolean;
  readonly onEdit: (member: HouseholdMemberVM) => void;
  readonly onDelete: (member: HouseholdMemberVM) => void;
  readonly onLoadMore: () => void;
  readonly onPageChange: (page: number) => void;
}

/**
 * List of household members with pagination support.
 * Uses infinite scroll on mobile and pagination controls on desktop.
 */
export const HouseholdMembersList = ({
  members,
  meta,
  isLoadingMore,
  onEdit,
  onDelete,
  onLoadMore,
  onPageChange,
}: HouseholdMembersListProps) => {
  const hasMorePages = meta ? meta.page < meta.totalPages : false;

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMorePages) {
      onLoadMore();
    }
  }, [hasMorePages, isLoadingMore, onLoadMore]);

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {members.map((member) => (
          <HouseholdMemberListItem key={member.id} member={member} onEdit={onEdit} onDelete={onDelete} />
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
          <PaginationControl meta={meta} onPageChange={onPageChange} isBusy={isLoadingMore} />
        </div>
      )}
    </div>
  );
};
