import { generateClient } from "aws-amplify/data";
import { defineStore } from "pinia";

const DEFAULT_COLLECTION_NAME = "Mira's room";
 
export const useCollectionStore = defineStore("collection", () => {
  const dataClient = generateClient();

  async function ensureCollectionForUser(currentUser) {
    const userId = currentUser?.userId;
    if (!userId) return;

    const { data: collections } = await dataClient.models.Collection.list({
      limit: 200,
    });
    console.log("Fetched collections for user:", { collections });
    const defaultCollections = (collections ?? []).filter((collection) => {
      const name = readCollectionName(collection?.property);
      return name === DEFAULT_COLLECTION_NAME;
    });

    if (defaultCollections.length === 0) {
      await dataClient.models.Collection.create({
        user: userId,
        property: { name: DEFAULT_COLLECTION_NAME },
      });
      return;
    }

    if (defaultCollections.length > 1) {
      const sortedByCreatedAt = [...defaultCollections].sort((a, b) => {
        const aTime = a?.createdAt ? Date.parse(a.createdAt) : 0;
        const bTime = b?.createdAt ? Date.parse(b.createdAt) : 0;
        return aTime - bTime;
      });

      const duplicates = sortedByCreatedAt.slice(1);
      for (const duplicate of duplicates) {
        if (!duplicate?.id) continue;
        await dataClient.models.Collection.delete({ id: duplicate.id });
      }
    }
  }

  return {
    dataClient,
    ensureCollectionForUser,
  };
});

function readCollectionName(property) {
  if (!property) return "";
  if (typeof property === "object") {
    return String(property?.name ?? "").trim();
  }
  if (typeof property === "string") {
    try {
      const parsed = JSON.parse(property);
      return String(parsed?.name ?? "").trim();
    } catch {
      return "";
    }
  }
  return "";
}
