// Server API Response Types
export interface ServerTokenUsage {
    tokenRequestCount: number;
    subscribed: boolean;
}

export interface DecorateResponse {
    editedImageBase64: string;
    products?: {
        items?: any[];
    } | any[];
    cleaningSteps?: Array<{
        id: string;
        title: string;
        description: string;
        completed: boolean;
        estimatedTime?: string;
    }>;
    tokenUsage?: ServerTokenUsage;
}
