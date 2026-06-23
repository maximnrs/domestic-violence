import { useEffect, useMemo, useState } from "react";
import type { LegalCase } from "../types/legalDashboard";
import { CaseStats } from "../components/cases/CaseStats";
import { CasesTable } from "../components/cases/CasesTable";
import { Card } from "../components/ui/Card";

const CASES_PER_PAGE = 10;
type PaginationItem = number | "ellipsis";

type CasesPageProps = {
  cases: LegalCase[];
  onOpenCase: (caseId: string) => void;
};

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const sortedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return sortedPages.flatMap((page, index) => {
    const previousPage = sortedPages[index - 1];
    return previousPage && page - previousPage > 1 ? ["ellipsis", page] : [page];
  });
}

export function CasesPage({ cases, onOpenCase }: CasesPageProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalCases = cases.length;
  const totalPages = Math.max(1, Math.ceil(totalCases / CASES_PER_PAGE));

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const visibleCases = useMemo(() => {
    const startIndex = (currentPage - 1) * CASES_PER_PAGE;
    return cases.slice(startIndex, startIndex + CASES_PER_PAGE);
  }, [cases, currentPage]);

  const paginationItems = useMemo(
    () => getPaginationItems(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const firstVisibleCase = totalCases === 0 ? 0 : (currentPage - 1) * CASES_PER_PAGE + 1;
  const lastVisibleCase = Math.min(currentPage * CASES_PER_PAGE, totalCases);

  return (
    <div className="stack">
      <CaseStats cases={cases} />
      <Card>
        <CasesTable cases={visibleCases} onOpenCase={onOpenCase} />
        <div className="table-footer">
          <span>
            Showing {firstVisibleCase} to {lastVisibleCase} of {totalCases} cases
          </span>
          <div className="pagination">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              Prev
            </button>
            {paginationItems.map((item, index) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${index}`}>...</span>
              ) : (
                <button
                  key={item}
                  className={item === currentPage ? "active" : ""}
                  type="button"
                  onClick={() => setCurrentPage(item)}
                >
                  {item}
                </button>
              )
            )}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
