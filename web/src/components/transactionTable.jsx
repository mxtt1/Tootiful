import React, { useState } from 'react';

const TransactionTable = ({ data = [] }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  // Use the data prop instead of sample data
  const transactions = data;

  // Filter transactions
  const filterTransactions = () => {
    return transactions.filter(transaction => {
      return statusFilter === 'all' || transaction.status === statusFilter;
    });
  };
   
  const filteredTransactions = filterTransactions();
      
  const getStatusStyle = (status) => {
    const baseStyle = styles.statusBadge;
    switch (status) {
      case 'completed':
      case 'paid':
        return { ...baseStyle, ...styles.statusCompleted };
      case 'pending':
        return { ...baseStyle, ...styles.statusPending };
      case 'failed':
      case 'refunded':
        return { ...baseStyle, ...styles.statusFailed };
      default:
        return baseStyle;
    }
  };

  // Format date as "August 4, 2022, 7:30AM"
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    };
    return date.toLocaleString('en-US', options);
  };

  const handleStatusFilterSelect = (filter) => {
    setStatusFilter(filter);
    setShowStatusDropdown(false);
  };

  // Get display name based on transaction type
  const getDisplayName = (transaction) => {
    if (transaction.type === 'student_payment') {
      return transaction.studentName || `Student ${transaction.studentId?.slice(0, 8)}`;
    } else if (transaction.type === 'tutor_payment') {
      return transaction.tutorName || `Tutor ${transaction.tutorId?.slice(0, 8)}`;
    }
    return transaction.username || 'Unknown';
  };

  // Get display amount with proper formatting
  const getDisplayAmount = (transaction) => {
    const amount = transaction.amount || transaction.paymentAmount || 0;
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Get card type or payment method
  const getPaymentMethod = (transaction) => {
    if (transaction.type === 'student_payment') {
      return transaction.cardType || 'Stripe';
    } else if (transaction.type === 'tutor_payment') {
      return 'Bank Transfer';
    }
    return transaction.cardType || 'Unknown';
  };

  // Get status display text
  const getStatusText = (transaction) => {
    if (transaction.type === 'tutor_payment') {
      return 'paid'; // Tutor payments are always completed/paid
    }
    return transaction.status || 'completed';
  };

  return (
    <div style={styles.container}>
      <div style={styles.filterDropdownContainer}>
        {/* Status Filter */}
        <div style={styles.dropdown}>
          <button
            style={styles.dropdownToggle}
            onClick={() => {
              setShowStatusDropdown(!showStatusDropdown);
            }}
          >
            <span style={styles.dropdownToggleText}>
              Status: {statusFilter}
            </span>
            <span style={styles.dropdownArrow}>▼</span>
          </button>
          
          {showStatusDropdown && (
            <div style={styles.dropdownMenu}>
              {['all', 'completed', 'paid', 'pending', 'failed', 'refunded'].map((filter) => (
                <div
                  key={filter}
                  style={{
                    ...styles.dropdownItem,
                    ...(statusFilter === filter && styles.dropdownItemActive)
                  }}
                  onClick={() => handleStatusFilterSelect(filter)}
                >
                  {filter}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Table */}
      <div style={styles.tableScroll}>
        <div style={styles.table}>
          {/* Table Header */}
          <div style={styles.headerRow}>
            <span style={{...styles.headerCell, ...styles.cell}}>User</span>
            <span style={{...styles.headerCell, ...styles.cell}}>Type</span>
            <span style={{...styles.headerCell, ...styles.cell}}>Date & Time</span>
            <span style={{...styles.headerCell, ...styles.cell, ...styles.amountCell}}>Amount</span>
            <span style={{...styles.headerCell, ...styles.cell}}>Payment Method</span>
            <span style={{...styles.headerCell, ...styles.cell}}>Status</span>
          </div>

          {/* Table Rows */}
          {filteredTransactions.map((transaction, index) => {
            const formattedDateTime = formatDateTime(transaction.date || transaction.paymentDate || transaction.createdAt);
            
            return (
              <div key={transaction.id || `transaction-${index}`} style={styles.dataRow}>
                <span style={{...styles.cell, ...styles.username}}>
                  {getDisplayName(transaction)}
                </span>
                <span style={{...styles.cell, ...styles.type}}>
                  <div style={{
                    ...styles.typeBadge,
                    ...(transaction.type === 'student_payment' ? styles.typeStudent : styles.typeTutor)
                  }}>
                    {transaction.type === 'student_payment' ? 'Student' : 'Tutor'}
                  </div>
                </span>
                <span style={{...styles.cell, ...styles.dateTime}}>{formattedDateTime}</span>
                <span style={{...styles.cell, ...styles.amount, ...styles.amountCell}}>
                  {getDisplayAmount(transaction)}
                </span>
                <span style={{...styles.cell, ...styles.cardType}}>
                  {getPaymentMethod(transaction)}
                </span>
                <div style={{...styles.cell, ...styles.statusCell}}>
                  <div style={getStatusStyle(getStatusText(transaction))}>
                    <span style={styles.statusText}>
                      {getStatusText(transaction).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* No results message */}
          {filteredTransactions.length === 0 && (
            <div style={styles.noResults}>
              <span style={styles.noResultsText}>
                No transactions found {statusFilter !== 'all' ? `with status ${statusFilter}` : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '16px',
    backgroundColor: '#fff',
    position: 'relative',
  },
  filterDropdownContainer: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    zIndex: 10,
    display: 'flex',
  },
  dropdown: {
    position: 'relative',
    display: 'inline-block',
  },
  dropdownToggle: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#6155F5',
    border: '2px solid #6155F5',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
  },
  dropdownToggleText: {
    fontSize: '14px',
  },
  dropdownArrow: {
    fontSize: '10px',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: '0',
    backgroundColor: '#fff',
    border: '2px solid #6155F5',
    borderRadius: '6px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    marginTop: '4px',
    minWidth: '120px',
    zIndex: 20,
  },
  dropdownItem: {
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
  },
  dropdownItemActive: {
    backgroundColor: '#6155F5',
    color: '#fff',
  },
  tableScroll: {
    overflowX: 'auto',
    marginTop: '60px', // Space for the dropdown
  },
  table: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    minWidth: '100%',
  },
  headerRow: {
    display: 'flex',
    backgroundColor: '#f8f9fa',
    padding: '12px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  dataRow: {
    display: 'flex',
    padding: '12px 0',
    borderBottom: '1px solid #e5e7eb',
    alignItems: 'center',
  },
  noResults: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 20px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  noResultsText: {
    fontSize: '14px',
  },
  headerCell: {
    fontWeight: '600',
    color: '#374151',
    fontSize: '12px',
  },
  cell: {
    padding: '0 8px',
    minWidth: '80px',
    flex: '1',
    display: 'flex',
    alignItems: 'center',
  },
  amountCell: {
    minWidth: '70px',
    flex: '0.8',
    justifyContent: 'center',
  },
  statusCell: {
    minWidth: '90px',
    flex: '1',
  },
  username: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#374151',
  },
  type: {
    fontSize: '12px',
    minWidth: '70px',
    flex: '0.7',
  },
  typeBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '600',
    textAlign: 'center',
  },
  typeStudent: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
  },
  typeTutor: {
    backgroundColor: '#f0fdf4',
    color: '#166534',
  },
  dateTime: {
    fontSize: '12px',
    color: '#6b7280',
  },
  amount: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#059669',
    textAlign: 'center',
  },
  cardType: {
    fontSize: '12px',
    color: '#6b7280',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '70px',
  },
  statusCompleted: {
    backgroundColor: '#d1fae5',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusFailed: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#374151',
  },
};

export default TransactionTable;