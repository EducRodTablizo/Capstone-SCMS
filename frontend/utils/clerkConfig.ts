export const isClerkConfigured = (): boolean => {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  return Boolean(
    key &&
      (key.startsWith('pk_test_') || key.startsWith('pk_live_')) &&
      !key.includes('placeholder')
  );
};

