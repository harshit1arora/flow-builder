export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 500
): Promise<T> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      console.warn(`[Retry] Attempt ${attempt} failed. Retries left: ${maxRetries - attempt}`);
      if (attempt >= maxRetries) {
        throw error;
      }
      
      // Exponential backoff with some jitter to avoid thundering herd
      const jitter = Math.random() * 200;
      const delay = baseDelay * Math.pow(2, attempt - 1) + jitter;
      
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Max retries exceeded");
}
