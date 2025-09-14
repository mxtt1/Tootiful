import React, { useState } from 'react';

const TransactionTable = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  // Sample transaction data
  const transactions = [
    {
      id: 1,
      username: 'john_doe',
      date: '2024-01-15T14:30:25', 
      amount: '$45.00',
      cardType: 'Visa',
      status: 'completed'
    },
    {
      id: 2,
      username: 'jane_smith',
      date: '2024-01-15T10:15:42', 
      amount: '$60.00',
      cardType: 'MasterCard',
      status: 'pending'
    },
    {
      id: 3,
      username: 'mike_wilson',
      date: '2024-01-14T16:20:18',
      amount: '$35.00',
      cardType: 'Amex',
      status: 'failed'
    },
    {
      id: 4,
      username: 'sarah_jones',
      date: '2024-01-10T09:45:33', 
      amount: '$50.00',
      cardType: 'Visa',
      status: 'completed'
    },
    {
      id: 5,
      username: 'david_brown',
      date: '2023-12-20T11:20:15', 
      amount: '$75.00',
      cardType: 'MasterCard',
      status: 'completed'
    },
    {
      id: 6,
      username: 'emma_wilson',
      date: '2024-01-01T08:00:00', 
      amount: '$90.00',
      cardType: 'Amex',
      status: 'pending'
    }
  ];

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
        return { ...baseStyle, ...styles.statusCompleted };
      case 'pending':
        return { ...baseStyle, ...styles.statusPending };
      case 'failed':
        return { ...baseStyle, ...styles.statusFailed };
      default:
        return baseStyle;
    }
  };

  // Format date as "August 4, 2022, 7:30AM"
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
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

  return (
    <div style={styles.container}>
      <div style={styles.filterDropdownContainer}>

        {/* Status Filter */}
        <div style={styles.dropdown}>
          <button
            style={styles.dropdownToggle}
            onClick={() => {
              setShowStatusDropdown(!showStatusDropdown);
              setShowTimeDropdown(false);
            }}
          >
            <span style={styles.dropdownToggleText}>
              Status: {statusFilter}
            </span>
            <span style={styles.dropdownArrow}>▼</span>
          </button>
          
          {showStatusDropdown && (
            <div style={styles.dropdownMenu}>
              {['all', 'completed', 'pending', 'failed'].map((filter) => (
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
            <span style={{...styles.headerCell, ...styles.cell}}>Username</span>
            <span style={{...styles.headerCell, ...styles.cell}}>Date & Time</span>
            <span style={{...styles.headerCell, ...styles.cell, ...styles.amountCell}}>Amount</span>
            <span style={{...styles.headerCell, ...styles.cell}}>Card Type</span>
            <span style={{...styles.headerCell, ...styles.cell}}>Status</span>
          </div>

          {/* Table Rows */}
          {filteredTransactions.map((transaction) => {
            const formattedDateTime = formatDateTime(transaction.date);
            
            return (
              <div key={transaction.id} style={styles.dataRow}>
                <span style={{...styles.cell, ...styles.username}}>{transaction.username}</span>
                <span style={{...styles.cell, ...styles.dateTime}}>{formattedDateTime}</span>
                <span style={{...styles.cell, ...styles.amount, ...styles.amountCell}}>
                  {transaction.amount}
                </span>
                <span style={{...styles.cell, ...styles.cardType}}>{transaction.cardType}</span>
                <div style={{...styles.cell, ...styles.statusCell}}>
                  <div style={getStatusStyle(transaction.status)}>
                    <span style={styles.statusText}>
                      {transaction.status.toUpperCase()}
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