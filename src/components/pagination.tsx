import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  if (totalPages <= 1) return null;

  return (
    <div className="p-4 pt-1 flex items-center justify-center">
      <div className="flex items-center space-x-2">
        <button 
          onClick={goToPrevPage}
          disabled={currentPage === 1}
          className={`p-1 rounded-full ${currentPage === 1 ? 'text-muted-foreground' : 'hover:bg-primary/10 text-primary'}`}
          aria-label="Previous page"
        >
          <ChevronLeftIcon size={20} />
        </button>
        
        <span className="text-xs text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        
        <button 
          onClick={goToNextPage}
          disabled={currentPage === totalPages}
          className={`p-1 rounded-full ${currentPage === totalPages ? 'text-muted-foreground' : 'hover:bg-primary/10 text-primary'}`}
          aria-label="Next page"
        >
          <ChevronRightIcon size={20} />
        </button>
      </div>
    </div>
  );
} 