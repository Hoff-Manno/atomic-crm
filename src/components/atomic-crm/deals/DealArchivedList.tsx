/* eslint-disable react-refresh/only-export-components */
import { useGetIdentity, useGetList } from "ra-core";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import type { Deal } from "../types";
import { DealCardContent } from "./DealCard";

const PER_PAGE = 50;

export const DealArchivedList = () => {
  const { identity } = useGetIdentity();
  const [openDialog, setOpenDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filter: Record<string, unknown> = {
    "archived_at@not.is": null,
  };
  if (debouncedSearch) {
    filter.q = debouncedSearch;
  }

  const {
    data: archivedDeals,
    total,
    isPending,
  } = useGetList<Deal>("deals", {
    pagination: { page, perPage: PER_PAGE },
    sort: { field: "archived_at", order: "DESC" },
    filter,
  });

  // Get a quick count to know whether to show the button at all
  const { total: totalCount, isPending: isCountPending } = useGetList<Deal>(
    "deals",
    {
      pagination: { page: 1, perPage: 1 },
      sort: { field: "id", order: "ASC" },
      filter: { "archived_at@not.is": null },
    },
  );

  useEffect(() => {
    if (!isPending && total === 0 && !debouncedSearch) {
      setOpenDialog(false);
    }
  }, [isPending, total, debouncedSearch]);

  if (!identity || isCountPending || !totalCount) return null;

  const totalPages = total ? Math.ceil(total / PER_PAGE) : 0;

  return (
    <div className="w-full flex flex-row items-center justify-center">
      <Button
        variant="ghost"
        onClick={() => setOpenDialog(true)}
        className="my-4"
      >
        View archived contracts ({totalCount.toLocaleString()})
      </Button>
      <Dialog open={openDialog} onOpenChange={() => setOpenDialog(false)}>
        <DialogContent className="lg:max-w-4xl overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
          <DialogTitle>Archived Contracts</DialogTitle>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {isPending ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Loading...
            </p>
          ) : archivedDeals && archivedDeals.length > 0 ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {archivedDeals.map((deal: Deal) => (
                  <div key={deal.id}>
                    <DealCardContent deal={deal} />
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages.toLocaleString()} (
                    {total?.toLocaleString()} contracts)
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {debouncedSearch
                ? "No archived contracts match your search."
                : "No archived contracts."}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export function getRelativeTimeString(dateString: string): string {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = date.getTime() - today.getTime();
  const unitDiff = Math.round(diff / (1000 * 60 * 60 * 24));

  // Check if the date is more than one week old
  if (Math.abs(unitDiff) > 7) {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "long",
    }).format(date);
  }

  // Intl.RelativeTimeFormat for dates within the last week
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  return ucFirst(rtf.format(unitDiff, "day"));
}

function ucFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
