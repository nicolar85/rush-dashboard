export const formatAgentName = (name) => {
  if (typeof name !== 'string' || !name) {
    return 'N/A';
  }
  return name
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};
