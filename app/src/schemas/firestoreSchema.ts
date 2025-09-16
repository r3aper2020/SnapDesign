// Firestore Schema Definitions for SnapDesign App

export interface FirestoreUser {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  lastLoginAt?: string; // ISO string
  profile?: {
    avatar?: string; // URL to profile image
    bio?: string;
    preferences?: {
      theme?: 'light' | 'dark' | 'auto';
      notifications?: {
        email?: boolean;
        push?: boolean;
        designUpdates?: boolean;
        marketing?: boolean;
      };
    };
  };
  stats?: {
    designsCreated: number;
    designsSaved: number;
    lastActiveAt: string; // ISO string
  };
  subscription?: {
    plan: 'free' | 'premium' | 'pro';
    status: 'active' | 'cancelled' | 'expired' | 'trial';
    startDate?: string; // ISO string
    endDate?: string; // ISO string
    trialEndDate?: string; // ISO string
  };
}

export interface FirestoreDesign {
  id: string;
  userId: string;
  title: string;
  description?: string;
  originalImageUrl: string;
  generatedImageUrl: string;
  products: Array<{
    name: string;
    type: string;
    qty: number;
    color?: string;
    estPriceUSD?: number;
    keywords: string[];
    placement?: {
      note?: string;
      bboxNorm?: number[];
    };
    amazonLink?: string;
  }>;
  theme?: string;
  keywords: string[];
  isPublic: boolean;
  isFavorite: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  tags?: string[];
  views?: number;
  likes?: number;
}

export interface FirestoreCollection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  designIds: string[];
  isPublic: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  coverImageUrl?: string;
}

export interface FirestoreActivity {
  id: string;
  userId: string;
  type: 'design_created' | 'design_shared' | 'design_liked' | 'collection_created' | 'profile_updated';
  data: Record<string, any>;
  createdAt: string; // ISO string
}

// Firestore Collection Names
export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  DESIGNS: 'designs',
  COLLECTIONS: 'collections',
  ACTIVITIES: 'activities',
} as const;

// Firestore Field Names
export const FIRESTORE_FIELDS = {
  USER: {
    UID: 'uid',
    EMAIL: 'email',
    DISPLAY_NAME: 'displayName',
    EMAIL_VERIFIED: 'emailVerified',
    CREATED_AT: 'createdAt',
    UPDATED_AT: 'updatedAt',
    LAST_LOGIN_AT: 'lastLoginAt',
    PROFILE: 'profile',
    STATS: 'stats',
    SUBSCRIPTION: 'subscription',
  },
  DESIGN: {
    ID: 'id',
    USER_ID: 'userId',
    TITLE: 'title',
    DESCRIPTION: 'description',
    ORIGINAL_IMAGE_URL: 'originalImageUrl',
    GENERATED_IMAGE_URL: 'generatedImageUrl',
    PRODUCTS: 'products',
    THEME: 'theme',
    KEYWORDS: 'keywords',
    IS_PUBLIC: 'isPublic',
    IS_FAVORITE: 'isFavorite',
    CREATED_AT: 'createdAt',
    UPDATED_AT: 'updatedAt',
    TAGS: 'tags',
    VIEWS: 'views',
    LIKES: 'likes',
  },
  COLLECTION: {
    ID: 'id',
    USER_ID: 'userId',
    NAME: 'name',
    DESCRIPTION: 'description',
    DESIGN_IDS: 'designIds',
    IS_PUBLIC: 'isPublic',
    CREATED_AT: 'createdAt',
    UPDATED_AT: 'updatedAt',
    COVER_IMAGE_URL: 'coverImageUrl',
  },
  ACTIVITY: {
    ID: 'id',
    USER_ID: 'userId',
    TYPE: 'type',
    DATA: 'data',
    CREATED_AT: 'createdAt',
  },
} as const;

// Helper functions for creating default documents
export const createDefaultUser = (uid: string, email: string, displayName: string): Omit<FirestoreUser, 'uid'> => {
  const now = new Date().toISOString();
  
  return {
    email,
    displayName,
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    profile: {
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          push: true,
          designUpdates: true,
          marketing: false,
        },
      },
    },
    stats: {
      designsCreated: 0,
      designsSaved: 0,
      lastActiveAt: now,
    },
    subscription: {
      plan: 'free',
      status: 'active',
    },
  };
};

export const createDefaultDesign = (
  id: string,
  userId: string,
  title: string,
  originalImageUrl: string,
  generatedImageUrl: string,
  products: FirestoreDesign['products'],
  keywords: string[]
): Omit<FirestoreDesign, 'id'> => {
  const now = new Date().toISOString();
  
  return {
    userId,
    title,
    originalImageUrl,
    generatedImageUrl,
    products,
    keywords,
    isPublic: false,
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
    views: 0,
    likes: 0,
  };
};

export const createDefaultCollection = (
  id: string,
  userId: string,
  name: string,
  description?: string
): Omit<FirestoreCollection, 'id'> => {
  const now = new Date().toISOString();
  
  return {
    userId,
    name,
    description,
    designIds: [],
    isPublic: false,
    createdAt: now,
    updatedAt: now,
  };
};

// Type guards
export const isFirestoreUser = (obj: any): obj is FirestoreUser => {
  return (
    obj &&
    typeof obj.uid === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.displayName === 'string' &&
    typeof obj.emailVerified === 'boolean' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
  );
};

export const isFirestoreDesign = (obj: any): obj is FirestoreDesign => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.originalImageUrl === 'string' &&
    typeof obj.generatedImageUrl === 'string' &&
    Array.isArray(obj.products) &&
    Array.isArray(obj.keywords) &&
    typeof obj.isPublic === 'boolean' &&
    typeof obj.isFavorite === 'boolean' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
  );
};

export const isFirestoreCollection = (obj: any): obj is FirestoreCollection => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.designIds) &&
    typeof obj.isPublic === 'boolean' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
  );
};
