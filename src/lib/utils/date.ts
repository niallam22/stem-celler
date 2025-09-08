export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB'); // DD/MM/YYYY format
}

export function parseDDMMYYYY(dateStr: string): Date {
  // Parse DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length !== 3) {
    throw new Error('Invalid date format. Expected DD/MM/YYYY');
  }
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  
  // Validate the date
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  
  return date;
}