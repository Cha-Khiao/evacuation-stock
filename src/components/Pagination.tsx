'use client';

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="d-flex justify-content-between align-items-center p-3 border-top bg-body-tertiary rounded-bottom">
      <span className="text-muted small">
        หน้า <b>{currentPage}</b> จาก <b>{totalPages}</b>
      </span>
      <ul className="pagination pagination-sm mb-0">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button 
            className="page-link" 
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            &laquo; ก่อนหน้า
          </button>
        </li>
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button 
            className="page-link" 
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            ถัดไป &raquo;
          </button>
        </li>
      </ul>
    </div>
  );
}