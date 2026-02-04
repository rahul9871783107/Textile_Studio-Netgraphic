export type Collection = {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
};

export type CollectionItem = {
    id: string;
    collectionId: string;
    projectId: string;

    order: number;

    // merchandising info
    note?: string;
    buyerName?: string;
    fabricQuality?: string;

    // optional: chosen colorway
    colorwayId?: string | null;

    createdAt: number;
    updatedAt: number;
};
