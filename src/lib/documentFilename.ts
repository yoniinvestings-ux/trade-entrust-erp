/**
 * Shortens a company name by:
 * 1. Taking first 2-3 words
 * 2. Removing common suffixes like Ltd, Inc, Corp, etc.
 */
export function shortenCompanyName(name: string | null | undefined, maxWords: number = 2): string {
  if (!name) return '';
  
  // Remove common suffixes
  const suffixesToRemove = [
    /\s+(Ltd\.?|Limited|Inc\.?|Corp\.?|Corporation|LLC|GmbH|Co\.?|Company|Pvt\.?|Private|Pty\.?)$/gi
  ];
  
  let shortened = name;
  suffixesToRemove.forEach(regex => {
    shortened = shortened.replace(regex, '');
  });
  
  // Take first N words
  const words = shortened.trim().split(/\s+/);
  return words.slice(0, maxWords).join(' ');
}

/**
 * Extracts ID suffix from order/quotation numbers
 * e.g., "ORD-250116-001" -> "0001" or just the last segment
 */
export function extractIdSuffix(orderNumber: string | null | undefined): string {
  if (!orderNumber) return '';
  const parts = orderNumber.split('-');
  return parts[parts.length - 1] || '';
}

/**
 * Generates document filename based on document type and context
 */
export function generateDocumentFilename(
  type: 'FACTORY_PO' | 'QUOTATION' | 'PI' | 'CI' | 'PL',
  options: {
    poNumber?: string;
    quotationNumber?: string;
    orderNumber?: string;
    projectTitle?: string;
    customerName?: string;
  }
): string {
  const { poNumber, quotationNumber, orderNumber, projectTitle, customerName } = options;
  const shortCustomer = shortenCompanyName(customerName, 2);
  
  switch (type) {
    case 'FACTORY_PO': {
      // Format: "DP1 产品采购合同 PO-XXXX"
      const poId = poNumber || '';
      return `DP1 产品采购合同 ${poId}`;
    }
    
    case 'QUOTATION': {
      // Format: "Quotation - Title ID-XXXX"
      const quotId = extractIdSuffix(quotationNumber);
      const title = projectTitle || 'Quotation';
      return `Quotation - ${title} ID-${quotId}`;
    }
    
    case 'PI': {
      // Format: "PI - CustomerShort - Title ID-XXXX"
      const orderId = extractIdSuffix(orderNumber);
      const title = projectTitle || 'Order';
      if (shortCustomer) {
        return `PI - ${shortCustomer} - ${title} ID-${orderId}`;
      }
      return `PI - ${title} ID-${orderId}`;
    }
    
    case 'CI': {
      // Format: "CI - CustomerShort - Title ID-XXXX"
      const orderId = extractIdSuffix(orderNumber);
      const title = projectTitle || 'Order';
      if (shortCustomer) {
        return `CI - ${shortCustomer} - ${title} ID-${orderId}`;
      }
      return `CI - ${title} ID-${orderId}`;
    }
    
    case 'PL': {
      // Format: "PL - CustomerShort - Title ID-XXXX"
      const orderId = extractIdSuffix(orderNumber);
      const title = projectTitle || 'Order';
      if (shortCustomer) {
        return `PL - ${shortCustomer} - ${title} ID-${orderId}`;
      }
      return `PL - ${title} ID-${orderId}`;
    }
    
    default:
      return 'document';
  }
}
