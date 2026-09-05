import { createServiceClient } from './service';

export function createAdminClient() {
  return createServiceClient();
}

export { createServiceClient };
