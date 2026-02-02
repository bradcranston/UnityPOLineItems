// Global state
let lineItemsData = null;
let filteredData = [];
let poType = 'Apparel'; // 'Apparel' or 'Standard'

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupDragAndDrop();
  showLoadingState();
});

// Show loading state
function showLoadingState() {
  const table = document.getElementById('line-items-table');
  const emptyState = document.getElementById('empty-state');
  const loadingState = document.getElementById('loading-state');
  
  table.style.display = 'none';
  emptyState.style.display = 'none';
  loadingState.style.display = 'block';
}

// Hide loading state
function hideLoadingState() {
  const loadingState = document.getElementById('loading-state');
  loadingState.style.display = 'none';
}

// FileMaker will call this function to pass data
window.loadPOLineItems = function(jsonData, type = 'Apparel') {
  try {
    // Hide loading state
    hideLoadingState();
    
    // Parse the data if it's a string
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    poType = type; // Store the PO type
    lineItemsData = data;
    filteredData = data.lineitems || [];
    
    // Render table header based on type
    renderTableHeader();
    
    // Populate filters
    populateFilters(filteredData);
    
    // Render line items
    renderLineItems(filteredData);
    
    // Update summary
    updateSummary(filteredData);
    
    console.log('PO Line Items loaded successfully', data);
  } catch (error) {
    hideLoadingState();
    console.error('Error loading PO Line Items:', error);
    showError('Failed to load line items: ' + error.message);
  }
};

// Generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Setup event listeners for search and filters
function setupEventListeners() {
  const searchInput = document.getElementById('search');
  const departmentFilter = document.getElementById('department-filter');
  const newRowBtn = document.getElementById('new-row-btn');
  
  searchInput.addEventListener('input', applyFilters);
  departmentFilter.addEventListener('change', applyFilters);
  
  if (newRowBtn) {
    newRowBtn.addEventListener('click', handleNewRow);
  }
}

// Handle new row creation
function handleNewRow() {
  const newId = generateUUID();
  
  // Create a blank item object based on PO type
  const newItem = {
    id: newId,
    amount: '',
    barCode: '',
    color: '',
    customer: '',
    department: '',
    description: '',
    itemNumber: '',
    jobNumber: '',
    order: (filteredData.length + 1).toString(),
    received: '',
    status: '',
    unitPrice: '$0.00'
  };
  
  // Add type-specific fields
  if (poType === 'Standard') {
    newItem.quantity = '';
    newItem.unitPer = '';
  } else {
    // Apparel type
    newItem.quantityXS = '';
    newItem.quantityS = '';
    newItem.quantityM = '';
    newItem.quantityL = '';
    newItem.quantityXL = '';
    newItem.quantityXXL = '';
    newItem.quantityXXXL = '';
    newItem.quantityXXXXL = '';
    newItem.quantityOther = '';
  }
  
  // Add to data arrays
  lineItemsData.lineitems.push(newItem);
  
  // Update filteredData to reflect the change
  applyFilters();
  
  // Call FileMaker script
  callFileMakerScript('Manage: PO Lines', {
    mode: 'newRow',
    id: newId
  });
}

// Setup delete button listeners
function setupDeleteButtons() {
  const deleteButtons = document.querySelectorAll('.delete-btn');
  
  deleteButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.stopPropagation();
      const itemId = this.getAttribute('data-item-id');
      
      if (confirm('Are you sure you want to delete this row?')) {
        // Remove from data arrays
        if (lineItemsData && lineItemsData.lineitems) {
          const index = lineItemsData.lineitems.findIndex(item => item.id === itemId);
          if (index !== -1) {
            lineItemsData.lineitems.splice(index, 1);
          }
        }
        
        // Update filteredData and re-render
        applyFilters();
        
        // Call FileMaker script
        callFileMakerScript('Manage: PO Lines', {
          mode: 'deleteRow',
          id: itemId
        });
      }
    });
  });
}

// Populate filter dropdowns
function populateFilters(items) {
  const departments = [...new Set(items.map(item => item.department).filter(Boolean))];
  
  const departmentFilter = document.getElementById('department-filter');
  departmentFilter.innerHTML = '<option value="">All Departments</option>';
  departments.forEach(dept => {
    departmentFilter.innerHTML += `<option value="${dept}">${dept}</option>`;
  });
}

// Apply filters
function applyFilters() {
  if (!lineItemsData || !lineItemsData.lineitems) return;
  
  const searchTerm = document.getElementById('search').value.toLowerCase();
  const departmentFilter = document.getElementById('department-filter').value;
  
  filteredData = lineItemsData.lineitems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.itemNumber.toLowerCase().includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm) ||
      item.customer.toLowerCase().includes(searchTerm) ||
      item.jobNumber.toLowerCase().includes(searchTerm) ||
      item.color.toLowerCase().includes(searchTerm);
    
    const matchesDepartment = !departmentFilter || item.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });
  
  renderLineItems(filteredData);
  updateSummary(filteredData);
}

// Render table header based on PO type
function renderTableHeader() {
  const thead = document.querySelector('#line-items-table thead tr');
  
  if (poType === 'Standard') {
    thead.innerHTML = `
      <th class="col-drag"></th>
      <th class="col-status">Status</th>
      <th class="col-received">Rec'd</th>
      <th class="col-qty-standard">Qty</th>
      <th class="col-item">Item Number</th>
      <th class="col-description">Description</th>
      <th class="col-job">Job Number</th>
      <th class="col-customer">Customer</th>
      <th class="col-department">Department</th>
      <th class="col-price">Unit Price</th>
      <th class="col-unit-per">Unit Per</th>
      <th class="col-amount">Amount</th>
      <th class="col-delete"></th>
    `;
  } else {
    // Apparel header
    thead.innerHTML = `
      <th class="col-drag"></th>
      <th class="col-status">Status</th>
      <th class="col-received">Rec'd</th>
      <th class="col-barcode">Bar Code</th>
      <th class="col-item">Item Number</th>
      <th class="col-description">Description</th>
      <th class="col-color">Color</th>
      <th class="col-qty">XS</th>
      <th class="col-qty">S</th>
      <th class="col-qty">M</th>
      <th class="col-qty">L</th>
      <th class="col-qty">XL</th>
      <th class="col-qty">2XL</th>
      <th class="col-qty">3XL</th>
      <th class="col-qty">4XL</th>
      <th class="col-qty">Other</th>
      <th class="col-job">Job Number</th>
      <th class="col-customer">Customer</th>
      <th class="col-department">Department</th>
      <th class="col-price">Price Ea</th>
      <th class="col-amount">Amount</th>
      <th class="col-delete"></th>
    `;
  }
}

// Render line items
function renderLineItems(items) {
  const tbody = document.getElementById('table-body');
  const table = document.getElementById('line-items-table');
  const emptyState = document.getElementById('empty-state');
  
  if (!items || items.length === 0) {
    tbody.innerHTML = '';
    table.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  table.style.display = 'table';
  emptyState.style.display = 'none';
  
  // Sort items by order value
  const sortedItems = [...items].sort((a, b) => {
    const orderA = parseInt(a.order) || 0;
    const orderB = parseInt(b.order) || 0;
    return orderA - orderB;
  });
  
  tbody.innerHTML = sortedItems.map((item, index) => {
    const calculatedAmount = calculateAmount(item);
    const statusClass = item.status ? item.status.toLowerCase().replace(/\s+/g, '-') : '';
    
    if (poType === 'Standard') {
      return renderStandardRow(item, items, statusClass, calculatedAmount);
    } else {
      return renderApparelRow(item, items, statusClass, calculatedAmount);
    }
  }).join('');
  
  // Setup status checkboxes
  setupStatusCheckboxes();
  
  // Setup department selects
  setupDepartmentSelects();
  
  // Reattach drag and drop listeners after rendering
  setupDragAndDrop();
  
  // Setup editable cell listeners
  setupEditableCells();
  
  // Setup checkbox listeners
  setupCheckboxes();
  
  // Setup delete buttons
  setupDeleteButtons();
}

// Render a row for Standard PO
function renderStandardRow(item, items, statusClass, calculatedAmount) {
  return `
    <tr class="${item.received ? 'row-received' : ''} ${statusClass}" 
        data-original-index="${items.indexOf(item)}" 
        data-item-number="${item.itemNumber}"
        data-job-number="${item.jobNumber}"
        data-item-id="${item.id}"
        draggable="true">
      <td class="col-drag">
        <div class="drag-handle">⋮⋮</div>
      </td>
      <td class="col-status">
        <label class="status-checkbox-label">
          <input type="checkbox" class="status-checkbox" data-status-value="APPR" ${item.status && item.status.includes('APPR') ? 'checked' : ''} />
          <span>APPR</span>
        </label>
        <label class="status-checkbox-label">
          <input type="checkbox" class="status-checkbox" data-status-value="B/O" ${item.status && item.status.includes('B/O') ? 'checked' : ''} />
          <span>B/O</span>
        </label>
      </td>
      <td class="col-received">
        <input type="checkbox" class="received-checkbox" data-field="received" ${item.received ? 'checked' : ''} />
      </td>
      <td class="col-qty-standard editable" contenteditable="true" data-field="quantity">${item.quantity || ''}</td>
      <td class="col-item editable" contenteditable="true" data-field="itemNumber">${item.itemNumber}</td>
      <td class="col-description editable" contenteditable="true" data-field="description">${item.description}</td>
      <td class="col-job editable" contenteditable="true" data-field="jobNumber">${item.jobNumber}</td>
      <td class="col-customer editable" contenteditable="true" data-field="customer">${item.customer}</td>
      <td class="col-department">
        <select class="department-select" data-field="department" data-item-id="${item.id}">
          <option value="">Select...</option>
          <option value="Bindery" ${item.department === 'Bindery' ? 'selected' : ''}>Bindery</option>
          <option value="Cleaning Supplies" ${item.department === 'Cleaning Supplies' ? 'selected' : ''}>Cleaning Supplies</option>
          <option value="Graphics" ${item.department === 'Graphics' ? 'selected' : ''}>Graphics</option>
          <option value="Prepress" ${item.department === 'Prepress' ? 'selected' : ''}>Prepress</option>
          <option value="Screen Printing" ${item.department === 'Screen Printing' ? 'selected' : ''}>Screen Printing</option>
          <option value="Embroidery" ${item.department === 'Embroidery' ? 'selected' : ''}>Embroidery</option>
          <option value="Heat Press" ${item.department === 'Heat Press' ? 'selected' : ''}>Heat Press</option>
          <option value="Sublimation" ${item.department === 'Sublimation' ? 'selected' : ''}>Sublimation</option>
          <option value="Laser Engraving" ${item.department === 'Laser Engraving' ? 'selected' : ''}>Laser Engraving</option>
          <option value="Diamond Drag Engraving" ${item.department === 'Diamond Drag Engraving' ? 'selected' : ''}>Diamond Drag Engraving</option>
          <option value="Sand Carving" ${item.department === 'Sand Carving' ? 'selected' : ''}>Sand Carving</option>
          <option value="Trophies" ${item.department === 'Trophies' ? 'selected' : ''}>Trophies</option>
          <option value="Logo Jet" ${item.department === 'Logo Jet' ? 'selected' : ''}>Logo Jet</option>
          <option value="Promotional Items" ${item.department === 'Promotional Items' ? 'selected' : ''}>Promotional Items</option>
          <option value="Brokered Stationery" ${item.department === 'Brokered Stationery' ? 'selected' : ''}>Brokered Stationery</option>
          <option value="Stock" ${item.department === 'Stock' ? 'selected' : ''}>Stock</option>
          <option value="DTF" ${item.department === 'DTF' ? 'selected' : ''}>DTF</option>
          <option value="Sample" ${item.department === 'Sample' ? 'selected' : ''}>Sample</option>
          <option value="Signs" ${item.department === 'Signs' ? 'selected' : ''}>Signs</option>
          <option value="Delivery to Fancy Fox" ${item.department === 'Delivery to Fancy Fox' ? 'selected' : ''}>Delivery to Fancy Fox</option>
          <option value="Return" ${item.department === 'Return' ? 'selected' : ''}>Return</option>
          <option value="Extra" ${item.department === 'Extra' ? 'selected' : ''}>Extra</option>
          <option value="Replacement" ${item.department === 'Replacement' ? 'selected' : ''}>Replacement</option>
          <option value="Blank" ${item.department === 'Blank' ? 'selected' : ''}>Blank</option>
          <option value="Mailing" ${item.department === 'Mailing' ? 'selected' : ''}>Mailing</option>
          <option value="Press" ${item.department === 'Press' ? 'selected' : ''}>Press</option>
          <option value="Brokered Trophies" ${item.department === 'Brokered Trophies' ? 'selected' : ''}>Brokered Trophies</option>
          <option value="Brokered Embroidery" ${item.department === 'Brokered Embroidery' ? 'selected' : ''}>Brokered Embroidery</option>
          <option value="Brokered Sublimation" ${item.department === 'Brokered Sublimation' ? 'selected' : ''}>Brokered Sublimation</option>
        </select>
      </td>
      <td class="col-price editable" contenteditable="true" data-field="unitPrice">${item.unitPrice}</td>
      <td class="col-unit-per editable" contenteditable="true" data-field="unitPer">${item.unitPer || ''}</td>
      <td class="col-amount">${calculatedAmount}</td>
      <td class="col-delete">
        <button class="delete-btn" data-item-id="${item.id}" title="Delete row">🗑️</button>
      </td>
    </tr>
  `;
}

// Render a row for Apparel PO
function renderApparelRow(item, items, statusClass, calculatedAmount) {
  const quantities = getQuantities(item);
  
  return `
      <tr class="${item.received ? 'row-received' : ''} ${statusClass}" 
          data-original-index="${items.indexOf(item)}" 
          data-item-number="${item.itemNumber}"
          data-job-number="${item.jobNumber}"
          data-item-id="${item.id}"
          draggable="true">
        <td class="col-drag">
          <div class="drag-handle">⋮⋮</div>
        </td>
        <td class="col-status">
          <label class="status-checkbox-label">
            <input type="checkbox" class="status-checkbox" data-status-value="APPR" ${item.status && item.status.includes('APPR') ? 'checked' : ''} />
            <span>APPR</span>
          </label>
          <label class="status-checkbox-label">
            <input type="checkbox" class="status-checkbox" data-status-value="B/O" ${item.status && item.status.includes('B/O') ? 'checked' : ''} />
            <span>B/O</span>
          </label>
        </td>
        <td class="col-received">
          <input type="checkbox" class="received-checkbox" data-field="received" ${item.received ? 'checked' : ''} />
        </td>
        <td class="col-barcode editable" contenteditable="true" data-field="barCode">${item.barCode || ''}</td>
        <td class="col-item editable" contenteditable="true" data-field="itemNumber">${item.itemNumber}</td>
        <td class="col-description editable" contenteditable="true" data-field="description">${item.description}</td>
        <td class="col-color editable" contenteditable="true" data-field="color">${item.color}</td>
        <td class="col-qty editable" contenteditable="true" data-field="quantityXS">${quantities[0].qty || ''}</td>
        <td class="col-qty editable" contenteditable="true" data-field="quantityS">${quantities[1].qty || ''}</td>
        <td class="col-qty editable" contenteditable="true" data-field="quantityM">${quantities[2].qty || ''}</td>
        <td class="col-qty editable" contenteditable="true" data-field="quantityL">${quantities[3].qty || ''}</td>
        <td class="col-qty editable" contenteditable="true" data-field="quantityXL">${quantities[4].qty || ''}</td>
        <td class="col-qty editable" contenteditable="true" data-field="quantityXXL">${quantities[5].qty || ''}</td>
        <td class="col-qty editable" contenteditable="true" data-field="quantityXXXL">${quantities[6].qty || ''}</td>
        <td class="col-qty editable" contenteditable="true" data-field="quantityXXXXL">${quantities[7].qty || ''}</td>
        <td class="col-qty editable" contenteditable="true" data-field="quantityOther">${quantities[8].qty || ''}</td>
        <td class="col-job editable" contenteditable="true" data-field="jobNumber">${item.jobNumber}</td>
        <td class="col-customer editable" contenteditable="true" data-field="customer">${item.customer}</td>
        <td class="col-department">
          <select class="department-select" data-field="department" data-item-id="${item.id}">
            <option value="">Select...</option>
            <option value="Bindery" ${item.department === 'Bindery' ? 'selected' : ''}>Bindery</option>
            <option value="Cleaning Supplies" ${item.department === 'Cleaning Supplies' ? 'selected' : ''}>Cleaning Supplies</option>
            <option value="Graphics" ${item.department === 'Graphics' ? 'selected' : ''}>Graphics</option>
            <option value="Prepress" ${item.department === 'Prepress' ? 'selected' : ''}>Prepress</option>
            <option value="Screen Printing" ${item.department === 'Screen Printing' ? 'selected' : ''}>Screen Printing</option>
            <option value="Embroidery" ${item.department === 'Embroidery' ? 'selected' : ''}>Embroidery</option>
            <option value="Heat Press" ${item.department === 'Heat Press' ? 'selected' : ''}>Heat Press</option>
            <option value="Sublimation" ${item.department === 'Sublimation' ? 'selected' : ''}>Sublimation</option>
            <option value="Laser Engraving" ${item.department === 'Laser Engraving' ? 'selected' : ''}>Laser Engraving</option>
            <option value="Diamond Drag Engraving" ${item.department === 'Diamond Drag Engraving' ? 'selected' : ''}>Diamond Drag Engraving</option>
            <option value="Sand Carving" ${item.department === 'Sand Carving' ? 'selected' : ''}>Sand Carving</option>
            <option value="Trophies" ${item.department === 'Trophies' ? 'selected' : ''}>Trophies</option>
            <option value="Logo Jet" ${item.department === 'Logo Jet' ? 'selected' : ''}>Logo Jet</option>
            <option value="Promotional Items" ${item.department === 'Promotional Items' ? 'selected' : ''}>Promotional Items</option>
            <option value="Brokered Stationery" ${item.department === 'Brokered Stationery' ? 'selected' : ''}>Brokered Stationery</option>
            <option value="Stock" ${item.department === 'Stock' ? 'selected' : ''}>Stock</option>
            <option value="DTF" ${item.department === 'DTF' ? 'selected' : ''}>DTF</option>
            <option value="Sample" ${item.department === 'Sample' ? 'selected' : ''}>Sample</option>
            <option value="Signs" ${item.department === 'Signs' ? 'selected' : ''}>Signs</option>
            <option value="Delivery to Fancy Fox" ${item.department === 'Delivery to Fancy Fox' ? 'selected' : ''}>Delivery to Fancy Fox</option>
            <option value="Return" ${item.department === 'Return' ? 'selected' : ''}>Return</option>
            <option value="Extra" ${item.department === 'Extra' ? 'selected' : ''}>Extra</option>
            <option value="Replacement" ${item.department === 'Replacement' ? 'selected' : ''}>Replacement</option>
            <option value="Blank" ${item.department === 'Blank' ? 'selected' : ''}>Blank</option>
            <option value="Mailing" ${item.department === 'Mailing' ? 'selected' : ''}>Mailing</option>
            <option value="Press" ${item.department === 'Press' ? 'selected' : ''}>Press</option>
            <option value="Brokered Trophies" ${item.department === 'Brokered Trophies' ? 'selected' : ''}>Brokered Trophies</option>
            <option value="Brokered Embroidery" ${item.department === 'Brokered Embroidery' ? 'selected' : ''}>Brokered Embroidery</option>
            <option value="Brokered Sublimation" ${item.department === 'Brokered Sublimation' ? 'selected' : ''}>Brokered Sublimation</option>
          </select>
        </td>
        <td class="col-price editable" contenteditable="true" data-field="unitPrice">${item.unitPrice}</td>
        <td class="col-amount">${calculatedAmount}</td>
        <td class="col-delete">
          <button class="delete-btn" data-item-id="${item.id}" title="Delete row">🗑️</button>
        </td>
      </tr>
    `;
}

// Extract quantities from item// Extract quantities from item
function getQuantities(item) {
  return [
    { size: 'XS', qty: parseInt(item.quantityXS) || 0 },
    { size: 'S', qty: parseInt(item.quantityS) || 0 },
    { size: 'M', qty: parseInt(item.quantityM) || 0 },
    { size: 'L', qty: parseInt(item.quantityL) || 0 },
    { size: 'XL', qty: parseInt(item.quantityXL) || 0 },
    { size: 'XXL', qty: parseInt(item.quantityXXL) || 0 },
    { size: 'XXXL', qty: parseInt(item.quantityXXXL) || 0 },
    { size: 'XXXXL', qty: parseInt(item.quantityXXXXL) || 0 },
    { size: 'Other', qty: parseInt(item.quantityOther) || 0 }
  ];
}

// Calculate amount from quantities and unit price
function calculateAmount(item) {
  let totalQty;
  let unitPrice = parseFloat(item.unitPrice.replace('$', '').replace(',', '')) || 0;
  
  if (poType === 'Standard') {
    // For Standard POs, use the quantity field directly
    totalQty = parseInt(item.quantity) || 0;
    
    // If unitPer is specified, divide the price by unitPer
    const unitPer = parseFloat(item.unitPer) || 0;
    if (unitPer > 0) {
      unitPrice = unitPrice / unitPer;
    }
  } else {
    // For Apparel POs, sum all size quantities
    const quantities = getQuantities(item);
    totalQty = quantities.reduce((sum, q) => sum + q.qty, 0);
  }
  
  const amount = (totalQty * unitPrice).toFixed(2);
  return `$${amount}`;
}

// Recalculate and update the amount cell for a row
function recalculateRowAmount(row, itemId) {
  const item = lineItemsData.lineitems.find(i => i.id === itemId);
  if (!item) return;
  
  const newAmount = calculateAmount(item);
  const amountCell = row.querySelector('.col-amount');
  if (amountCell) {
    amountCell.textContent = newAmount;
  }
  
  // Update the summary totals
  updateSummary(filteredData);
}

// Update summary statistics
function updateSummary(items) {
  const totalItems = items.length;
  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  document.getElementById('total-items').textContent = totalItems;
  document.getElementById('total-amount').textContent = `$${totalAmount.toFixed(2)}`;
}

// Show error message
function showError(message) {
  const tbody = document.getElementById('table-body');
  const table = document.getElementById('line-items-table');
  const emptyState = document.getElementById('empty-state');
  
  table.style.display = 'none';
  emptyState.style.display = 'none';
  
  tbody.innerHTML = '';
  const tableContainer = document.querySelector('.table-container');
  const existingError = tableContainer.querySelector('.error-message');
  if (existingError) existingError.remove();
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;
  tableContainer.appendChild(errorDiv);
}

// Setup drag and drop functionality
let draggedRow = null;

function setupDragAndDrop() {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  
  const rows = tbody.querySelectorAll('tr[draggable="true"]');
  
  rows.forEach(row => {
    row.addEventListener('dragstart', handleDragStart);
    row.addEventListener('dragover', handleDragOver);
    row.addEventListener('drop', handleDrop);
    row.addEventListener('dragend', handleDragEnd);
    row.addEventListener('dragenter', handleDragEnter);
    row.addEventListener('dragleave', handleDragLeave);
  });
}

function handleDragStart(e) {
  draggedRow = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  
  if (this !== draggedRow && draggedRow) {
    // Remove all drag-over classes first
    document.querySelectorAll('tr').forEach(row => {
      row.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    
    // Get all rows and find positions
    const tbody = document.getElementById('table-body');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const draggedIndex = rows.indexOf(draggedRow);
    const targetIndex = rows.indexOf(this);
    
    // Always show below indicator if dragging down, above if dragging up
    if (draggedIndex < targetIndex) {
      this.classList.add('drag-over-bottom');
    } else {
      this.classList.add('drag-over-top');
    }
  }
  
  return false;
}

function handleDragEnter(e) {
  if (this !== draggedRow && draggedRow) {
    const tbody = document.getElementById('table-body');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const draggedIndex = rows.indexOf(draggedRow);
    const targetIndex = rows.indexOf(this);
    
    // Show visual feedback
    if (draggedIndex < targetIndex) {
      this.classList.add('drag-over-bottom');
    } else {
      this.classList.add('drag-over-top');
    }
  }
}

function handleDragLeave(e) {
  // Only remove classes if we're leaving for another row or outside
  const relatedTarget = e.relatedTarget;
  if (relatedTarget && relatedTarget.tagName === 'TR' && relatedTarget !== this) {
    this.classList.remove('drag-over-top', 'drag-over-bottom');
  }
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  if (e.preventDefault) {
    e.preventDefault();
  }
  
  if (draggedRow && draggedRow !== this) {
    const tbody = document.getElementById('table-body');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const draggedIndex = rows.indexOf(draggedRow);
    const targetIndex = rows.indexOf(this);
    
    // Insert based on direction of drag
    if (draggedIndex < targetIndex) {
      // Dragging down - insert after target
      this.parentNode.insertBefore(draggedRow, this.nextSibling);
    } else {
      // Dragging up - insert before target
      this.parentNode.insertBefore(draggedRow, this);
    }
    
    // Update order values
    updateOrderValues();
  }
  
  // Clean up visual indicators
  this.classList.remove('drag-over-top', 'drag-over-bottom');
  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  
  // Remove all drag-over classes
  const rows = document.querySelect-top', 'drag-over-bottomorAll('tr');
  rows.forEach(row => {
    row.classList.remove('drag-over');
  });
}

function updateOrderValues() {
  const tbody = document.getElementById('table-body');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  
  const updates = [];
  
  // Update the order property for each item based on new visual position
  rows.forEach((row, visualIndex) => {
    const itemNumber = row.getAttribute('data-item-number');
    const jobNumber = row.getAttribute('data-job-number');
    const originalIndex = parseInt(row.getAttribute('data-original-index'));
    const itemId = row.getAttribute('data-item-id');
    const newOrder = (visualIndex + 1).toString();
    
    // Find and update in filteredData
    const filteredItem = filteredData[originalIndex];
    if (filteredItem && filteredItem.itemNumber === itemNumber && filteredItem.jobNumber === jobNumber) {
      const oldOrder = filteredItem.order;
      if (oldOrder !== newOrder) {
        filteredItem.order = newOrder;
        updates.push({
          id: itemId,
          field: 'order',
          value: newOrder,
          oldValue: oldOrder
        });
      }
    }
    
    // Also update in the original lineItemsData
    if (lineItemsData && lineItemsData.lineitems) {
      const originalItem = lineItemsData.lineitems.find(item => 
        item.itemNumber === itemNumber && 
        item.jobNumber === jobNumber
      );
      if (originalItem) {
        originalItem.order = newOrder;
      }
    }
  });
  
  // Call FileMaker script with all the order changes
  if (updates.length > 0) {
    callFileMakerScript('Manage: PO Lines', {
      updates: updates,
      poId: lineItemsData.id,
        type: 'array',
        mode: 'updateLines'
    });
  }
  
  // Re-render to show updated order numbers
  renderLineItems(filteredData);
  
  console.log('Order values updated:', filteredData.map(item => ({ item: item.itemNumber, order: item.order })));
}

// Setup editable cells
function setupEditableCells() {
  const editableCells = document.querySelectorAll('td.editable');
  
  editableCells.forEach(cell => {
    // Store original value when starting to edit
    cell.addEventListener('focus', function() {
      this.dataset.originalValue = this.textContent;
      this.classList.add('editing');
    });
    
    // Handle when user finishes editing
    cell.addEventListener('blur', function() {
      this.classList.remove('editing');
      const newValue = this.textContent.trim();
      const originalValue = this.dataset.originalValue;
      
      // Only call FileMaker if value actually changed
      if (newValue !== originalValue) {
        const row = this.closest('tr');
        const itemId = row.getAttribute('data-item-id');
        const fieldName = this.getAttribute('data-field');
        
        // Update the data in memory
        updateItemField(itemId, fieldName, newValue);
        
        // If quantity or price field changed, recalculate amount
        if (fieldName.startsWith('quantity') || fieldName === 'unitPrice' || fieldName === 'unitPer') {
          recalculateRowAmount(row, itemId);
        }
        
        // Call FileMaker script with the change
        callFileMakerScript('Manage: PO Lines', {
          id: itemId,
          field: fieldName,
          value: newValue,
          oldValue: originalValue,
        type: 'object',
        mode: 'updateLines'
        });
      }
    });
    
    // Prevent drag while editing
    cell.addEventListener('mousedown', function(e) {
      const row = this.closest('tr');
      if (row && this.matches(':focus')) {
        row.setAttribute('draggable', 'false');
      }
    });
    
    cell.addEventListener('blur', function() {
      const row = this.closest('tr');
      if (row) {
        row.setAttribute('draggable', 'true');
      }
    });
    
    // Handle Enter key to save and move to next cell
    cell.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.blur();
        
        // Move to next editable cell
        const row = this.closest('tr');
        const cells = Array.from(row.querySelectorAll('td.editable'));
        const currentIndex = cells.indexOf(this);
        
        if (currentIndex < cells.length - 1) {
          cells[currentIndex + 1].focus();
        } else {
          // Move to first cell of next row
          const nextRow = row.nextElementSibling;
          if (nextRow) {
            const firstCell = nextRow.querySelector('td.editable');
            if (firstCell) firstCell.focus();
          }
        }
      } else if (e.key === 'Escape') {
        // Revert changes on Escape
        this.textContent = this.dataset.originalValue;
        this.blur();
      }
    });
  });
}

// Update item field in data
function updateItemField(itemId, fieldName, newValue) {
  // Update in filteredData
  const filteredItem = filteredData.find(item => item.id === itemId);
  if (filteredItem) {
    filteredItem[fieldName] = newValue;
  }
  
  // Update in lineItemsData
  if (lineItemsData && lineItemsData.lineitems) {
    const originalItem = lineItemsData.lineitems.find(item => item.id === itemId);
    if (originalItem) {
      originalItem[fieldName] = newValue;
    }
  }
  
  console.log('Updated field:', { id: itemId, field: fieldName, value: newValue });
}

// Setup checkbox listeners
function setupCheckboxes() {
  const checkboxes = document.querySelectorAll('.received-checkbox');
  
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const row = this.closest('tr');
      const itemId = row.getAttribute('data-item-id');
      const fieldName = this.getAttribute('data-field');
      const isChecked = this.checked;
      const newValue = isChecked ? '1' : '';
      const oldValue = isChecked ? '' : '1';
      
      // Update row styling
      if (isChecked) {
        row.classList.add('row-received');
      } else {
        row.classList.remove('row-received');
      }
      
      // Update the data in memory
      updateItemField(itemId, fieldName, newValue);
      
      // Call FileMaker script with the change
      callFileMakerScript('Manage: PO Lines', {
        id: itemId,
        field: fieldName,
        value: newValue,
        oldValue: oldValue,
        checked: isChecked,
        type: 'object',
        mode: 'updateLines'
      });
    });
  });
}

// Setup status checkboxes
function setupStatusCheckboxes() {
  const statusCheckboxes = document.querySelectorAll('.status-checkbox');
  
  statusCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const row = this.closest('tr');
      const itemId = row.getAttribute('data-item-id');
      const statusCell = this.closest('.col-status');
      
      // Get all status checkboxes in this row
      const allCheckboxes = statusCell.querySelectorAll('.status-checkbox');
      const checkedValues = [];
      
      allCheckboxes.forEach(cb => {
        if (cb.checked) {
          checkedValues.push(cb.getAttribute('data-status-value'));
        }
      });
      
      // Create return-separated list
      const newValue = checkedValues.join('\n');
      const oldValue = filteredData.find(item => item.id === itemId)?.status || '';
      
      // Update the data in memory
      updateItemField(itemId, 'status', newValue);
      
      // Call FileMaker script with the change
      callFileMakerScript('Manage: PO Lines', {
        id: itemId,
        field: 'status',
        value: newValue,
        oldValue: oldValue,
        checkedItems: checkedValues,
        type: 'object',
        mode: 'updateLines'
      });
    });
  });
}

// Setup department select dropdowns
function setupDepartmentSelects() {
  const departmentSelects = document.querySelectorAll('.department-select');
  
  departmentSelects.forEach(select => {
    select.addEventListener('change', function() {
      const itemId = this.getAttribute('data-item-id');
      const fieldName = this.getAttribute('data-field');
      const newValue = this.value;
      const oldValue = filteredData.find(item => item.id === itemId)?.department || '';
      
      // Update the data in memory
      updateItemField(itemId, fieldName, newValue);
      
      // Call FileMaker script with the change
      callFileMakerScript('Manage: PO Lines', {
        id: itemId,
        field: fieldName,
        value: newValue,
        oldValue: oldValue,
        type: 'object',
        mode: 'updateLines'
      });
    });
  });
}

// Call FileMaker script
function callFileMakerScript(scriptName, parameters) {
  try {
    const paramJSON = JSON.stringify(parameters);
    
    // Check if FileMaker object exists
    if (window.FileMaker) {
      window.FileMaker.PerformScript(scriptName, paramJSON);
      console.log('Called FileMaker script:', scriptName, parameters);
    } else {
      // For testing without FileMaker
      console.log('FileMaker not available. Would call script:', scriptName, 'with params:', parameters);
    }
  } catch (error) {
    console.error('Error calling FileMaker script:', error);
  }
}

// For testing - remove in production or keep for development
// Uncomment the following to test with sample data:
/*
fetch('./lineData.json')
  .then(response => response.json())
  .then(data => window.loadPOLineItems(data))
  .catch(error => console.error('Error loading test data:', error));
*/