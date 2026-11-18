export const colors = {
  ink: '#18211C',
  muted: '#737C76',
  green: '#087443',
  greenDark: '#075D37',
  greenLight: '#E8F4EC',
  canvas: '#F7F8F5',
  white: '#FFFFFF',
  border: '#E8EBE7',
  orange: '#F3A33B',
  red: '#C83E3E',
};

export const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
