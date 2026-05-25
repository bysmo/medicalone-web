import { useMemo, useState } from 'react';

/**
 * Pagination, recherche et découpage client pour DataTable.
 */
export function useClientTable(data, { searchKeys = [], initialPageSize = 10 } = {}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(row =>
      searchKeys.some(key => {
        const val = row[key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, searchKeys]);

  const totalElements = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize) || 1);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));

  const paginated = useMemo(
    () => filtered.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [filtered, safePage, pageSize]
  );

  const pagination = {
    currentPage: safePage,
    totalPages,
    totalElements,
    pageSize,
    onPageChange: (p) => setPage(Math.max(0, p)),
    onPageSizeChange: (size) => {
      setPageSize(size);
      setPage(0);
    },
  };

  const onSearch = (val) => {
    setSearch(val);
    setPage(0);
  };

  return { search, onSearch, paginated, filtered, pagination, setPage };
}
