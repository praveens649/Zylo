import {
  numbersApi,
  GenerateNumbersPayload,
  ListAvailableNumbersParams,
} from "@/api/numbers.api";

/**
 * Triggers the backend Number Generation Engine to produce a batch of validated Indian numbers.
 */
export async function generateNumbersAction(payload: GenerateNumbersPayload) {
  return numbersApi.generate(payload);
}

/**
 * Retrieves the full numbers inventory and summary stats for administrative management.
 */
export async function fetchAdminInventoryAction(params: ListAvailableNumbersParams = {}) {
  return numbersApi.getAdminInventory(params);
}

/**
 * Deletes an unassigned number from the inventory.
 */
export async function deleteNumberAction(id: string) {
  return numbersApi.delete(id);
}
