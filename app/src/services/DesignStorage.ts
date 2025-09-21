import * as SQLite from 'expo-sqlite';

export interface TokenUsage {
  imageGeneration: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  textAnalysis: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  grandTotal: number;
  inputTokensTotal: number;
  outputTokensTotal: number;
}

export interface SavedDesign {
  id: string;
  timestamp: number;
  description: string;
  originalImage: string;
  generatedImage: string;
  serviceType?: 'design' | 'declutter' | 'makeover'; // Add service type
  products?: Array<{
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
  cleaningSteps?: Array<{
    id: string;
    title: string;
    description: string;
    completed: boolean;
    estimatedTime?: string;
  }>;
  tokenUsage?: TokenUsage;
}

export interface SavedEdit {
  id: string;
  designId: string;
  timestamp: number;
  editInstructions: string;
  originalImage: string;
  editedImage: string;
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
  tokenUsage?: TokenUsage;
}

const DB_NAME = 'designs.db';

class DesignStorage {
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private async initDatabase(): Promise<void> {
    if (this.db) return;
    
    // If initialization is already in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this._doInit();
    return this.initPromise;
  }

  private async _doInit(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(DB_NAME);
    } catch (error) {
      console.error('❌ Error opening database:', error);
      this.initPromise = null; // Reset so we can try again
      throw error;
    }
    
    // Create tables if they don't exist
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS designs (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        description TEXT NOT NULL,
        originalImage TEXT NOT NULL,
        generatedImage TEXT NOT NULL,
        serviceType TEXT,
        products TEXT,
        cleaningSteps TEXT,
        tokenUsage TEXT
      );
      
      CREATE TABLE IF NOT EXISTS checkbox_states (
        design_id TEXT PRIMARY KEY,
        checked_items TEXT NOT NULL,
        FOREIGN KEY (design_id) REFERENCES designs (id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS edits (
        id TEXT PRIMARY KEY,
        design_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        editInstructions TEXT NOT NULL,
        originalImage TEXT NOT NULL,
        editedImage TEXT NOT NULL,
        products TEXT NOT NULL,
        tokenUsage TEXT,
        FOREIGN KEY (design_id) REFERENCES designs (id) ON DELETE CASCADE
      );
    `);

    // Add tokenUsage column if it doesn't exist (migration for existing databases)
    try {
      await this.db.execAsync(`
        ALTER TABLE designs ADD COLUMN tokenUsage TEXT;
      `);
    } catch (error) {
      // Column already exists, ignore the error
      console.log('TokenUsage column already exists or migration not needed');
    }
    
    this.initPromise = null; // Reset after successful initialization
  }

  // Save a new design
  async saveDesign(design: Omit<SavedDesign, 'id' | 'timestamp'>): Promise<SavedDesign> {
    try {
      await this.initDatabase();
      
      const savedDesign: SavedDesign = {
        ...design,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };

      await this.db!.runAsync(
        `INSERT INTO designs (id, timestamp, description, originalImage, generatedImage, serviceType, products, cleaningSteps, tokenUsage) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          savedDesign.id,
          savedDesign.timestamp,
          savedDesign.description,
          savedDesign.originalImage,
          savedDesign.generatedImage,
          savedDesign.serviceType || 'design',
          JSON.stringify(savedDesign.products || []),
          JSON.stringify(savedDesign.cleaningSteps || []),
          JSON.stringify(savedDesign.tokenUsage || null)
        ]
      );

      console.log('💾 Design saved to database:', {
        id: savedDesign.id,
        description: savedDesign.description,
        serviceType: savedDesign.serviceType,
        productsCount: savedDesign.products?.length || 0,
        cleaningStepsCount: savedDesign.cleaningSteps?.length || 0,
        originalImageSize: savedDesign.originalImage.length,
        generatedImageSize: savedDesign.generatedImage.length,
        tokenUsage: savedDesign.tokenUsage?.grandTotal || 0
      });
      return savedDesign;
    } catch (error) {
      console.error('❌ Error saving design:', error);
      throw new Error('Failed to save design');
    }
  }

  // Save a new edit
  async saveEdit(edit: Omit<SavedEdit, 'id' | 'timestamp'>): Promise<SavedEdit> {
    try {
      await this.initDatabase();
      
      const savedEdit: SavedEdit = {
        ...edit,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };

      await this.db!.runAsync(
        `INSERT INTO edits (id, design_id, timestamp, editInstructions, originalImage, editedImage, products, tokenUsage) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          savedEdit.id,
          savedEdit.designId,
          savedEdit.timestamp,
          savedEdit.editInstructions,
          savedEdit.originalImage,
          savedEdit.editedImage,
          JSON.stringify(savedEdit.products),
          JSON.stringify(savedEdit.tokenUsage || null)
        ]
      );

      console.log('💾 Edit saved to database:', {
        id: savedEdit.id,
        designId: savedEdit.designId,
        editInstructions: savedEdit.editInstructions,
        productsCount: savedEdit.products.length,
        originalImageSize: savedEdit.originalImage.length,
        editedImageSize: savedEdit.editedImage.length,
        tokenUsage: savedEdit.tokenUsage?.grandTotal || 0
      });
      return savedEdit;
    } catch (error) {
      console.error('❌ Error saving edit:', error);
      throw new Error('Failed to save edit');
    }
  }

  // Get all saved designs (for backward compatibility)
  async getSavedDesigns(): Promise<SavedDesign[]> {
    try {
      await this.initDatabase();
      
      const result = await this.db!.getAllAsync(
        `SELECT * FROM designs ORDER BY timestamp DESC`
      );

      const designs = result.map((row: any) => {
        const products = row.products ? JSON.parse(row.products) : [];
        const cleaningSteps = row.cleaningSteps ? JSON.parse(row.cleaningSteps) : [];
        
        // Auto-detect service type for existing records
        let serviceType = row.serviceType;
        if (!serviceType) {
          if (cleaningSteps.length > 0 && products.length === 0) {
            serviceType = 'declutter';
          } else {
            serviceType = 'design';
          }
        }
        
        return {
          id: row.id,
          timestamp: row.timestamp,
          description: row.description,
          originalImage: row.originalImage,
          generatedImage: row.generatedImage,
          serviceType,
          products,
          cleaningSteps,
          tokenUsage: row.tokenUsage ? JSON.parse(row.tokenUsage) : undefined
        };
      });

      console.log('📚 Loaded designs from database:', {
        count: designs.length,
        designs: designs.map(d => ({
          id: d.id,
          description: d.description,
          serviceType: d.serviceType,
          productsCount: d.products?.length || 0,
          cleaningStepsCount: d.cleaningSteps?.length || 0,
          timestamp: new Date(d.timestamp).toLocaleString()
        }))
      });

      return designs;
    } catch (error) {
      console.error('❌ Error loading designs:', error);
      return [];
    }
  }

  // Get saved designs with pagination for lazy loading
  async getSavedDesignsPaginated(limit: number = 6, offset: number = 0): Promise<{
    designs: SavedDesign[];
    hasMore: boolean;
    total: number;
  }> {
    try {
      await this.initDatabase();
      
      // Get paginated results first (faster)
      const result = await this.db!.getAllAsync(
        `SELECT * FROM designs ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
        [limit + 1, offset] // Get one extra to check if there are more
      );

      const designs = result.slice(0, limit).map((row: any) => {
        const products = row.products ? JSON.parse(row.products) : [];
        const cleaningSteps = row.cleaningSteps ? JSON.parse(row.cleaningSteps) : [];
        
        // Auto-detect service type for existing records
        let serviceType = row.serviceType;
        if (!serviceType) {
          if (cleaningSteps.length > 0 && products.length === 0) {
            serviceType = 'declutter';
          } else {
            serviceType = 'design';
          }
        }
        
        return {
          id: row.id,
          timestamp: row.timestamp,
          description: row.description,
          originalImage: row.originalImage,
          generatedImage: row.generatedImage,
          serviceType,
          products,
          cleaningSteps,
          tokenUsage: row.tokenUsage ? JSON.parse(row.tokenUsage) : undefined
        };
      });

      const hasMore = result.length > limit;
      
      // Only get total count if we need it (for first load or when hasMore is false)
      let total = 0;
      if (offset === 0 || !hasMore) {
        const countResult = await this.db!.getFirstAsync(
          `SELECT COUNT(*) as count FROM designs`
        ) as { count: number } | null;
        total = countResult?.count || 0;
      } else {
        // Estimate total based on current data
        total = offset + designs.length + (hasMore ? 1 : 0);
      }

      console.log('📚 Loaded paginated designs from database:', {
        loaded: designs.length,
        offset,
        total,
        hasMore,
        designs: designs.map(d => ({
          id: d.id,
          description: d.description,
          serviceType: d.serviceType,
          productsCount: d.products?.length || 0,
          cleaningStepsCount: d.cleaningSteps?.length || 0,
          timestamp: new Date(d.timestamp).toLocaleString()
        }))
      });

      return {
        designs,
        hasMore,
        total
      };
    } catch (error) {
      console.error('❌ Error loading paginated designs:', error);
      return {
        designs: [],
        hasMore: false,
        total: 0
      };
    }
  }

  // Delete a design
  async deleteDesign(designId: string): Promise<void> {
    try {
      await this.initDatabase();
      
      await this.db!.runAsync(
        `DELETE FROM designs WHERE id = ?`,
        [designId]
      );
      console.log('🗑️ Design deleted from database:', designId);
    } catch (error) {
      console.error('❌ Error deleting design:', error);
      throw new Error('Failed to delete design');
    }
  }

  // Clear all designs
  async clearAllDesigns(): Promise<void> {
    try {
      await this.initDatabase();
      
      await this.db!.runAsync(`DELETE FROM designs`);
    } catch (error) {
      console.error('Error clearing designs:', error);
      throw new Error('Failed to clear designs');
    }
  }

  // Get design by ID
  async getDesignById(designId: string): Promise<SavedDesign | null> {
    try {
      await this.initDatabase();
      
      const result = await this.db!.getFirstAsync(
        `SELECT * FROM designs WHERE id = ?`,
        [designId]
      ) as {
        id: string;
        timestamp: number;
        description: string;
        originalImage: string;
        generatedImage: string;
        products: string;
        tokenUsage?: string | null;
      } | null;

      if (!result) return null;

      return {
        id: result.id,
        timestamp: result.timestamp,
        description: result.description,
        originalImage: result.originalImage,
        generatedImage: result.generatedImage,
        products: JSON.parse(result.products)
      };
    } catch (error) {
      console.error('Error getting design by ID:', error);
      return null;
    }
  }

  // Save checkbox states for a design
  async saveCheckboxStates(designId: string, checkedItems: Set<number>): Promise<void> {
    try {
      await this.initDatabase();
      
      const checkedArray = Array.from(checkedItems);
      await this.db!.runAsync(
        `INSERT OR REPLACE INTO checkbox_states (design_id, checked_items) VALUES (?, ?)`,
        [designId, JSON.stringify(checkedArray)]
      );
      console.log('✅ Checkbox states saved for design:', designId);
    } catch (error) {
      console.error('❌ Error saving checkbox states:', error);
      throw new Error('Failed to save checkbox states');
    }
  }

  // Load checkbox states for a design
  async loadCheckboxStates(designId: string): Promise<Set<number>> {
    try {
      await this.initDatabase();
      
      const result = await this.db!.getFirstAsync(
        `SELECT checked_items FROM checkbox_states WHERE design_id = ?`,
        [designId]
      ) as { checked_items: string } | null;

      if (result && result.checked_items) {
        const checkedArray = JSON.parse(result.checked_items);
        return new Set(checkedArray);
      }
      
      return new Set();
    } catch (error) {
      console.error('❌ Error loading checkbox states:', error);
      return new Set();
    }
  }

  // Get all edits for a specific design
  async getEditsForDesign(designId: string): Promise<SavedEdit[]> {
    try {
      await this.initDatabase();
      
      const result = await this.db!.getAllAsync(
        `SELECT * FROM edits WHERE design_id = ? ORDER BY timestamp DESC`,
        [designId]
      );

      return result.map((row: any) => ({
        id: row.id,
        designId: row.design_id,
        timestamp: row.timestamp,
        editInstructions: row.editInstructions,
        originalImage: row.originalImage,
        editedImage: row.editedImage,
        products: JSON.parse(row.products),
        tokenUsage: row.tokenUsage ? JSON.parse(row.tokenUsage) : undefined
      }));
    } catch (error) {
      console.error('❌ Error loading edits for design:', error);
      return [];
    }
  }

  // Get all edits (across all designs)
  async getAllEdits(): Promise<SavedEdit[]> {
    try {
      await this.initDatabase();
      
      const result = await this.db!.getAllAsync(
        `SELECT * FROM edits ORDER BY timestamp DESC`
      );

      return result.map((row: any) => ({
        id: row.id,
        designId: row.design_id,
        timestamp: row.timestamp,
        editInstructions: row.editInstructions,
        originalImage: row.originalImage,
        editedImage: row.editedImage,
        products: JSON.parse(row.products),
        tokenUsage: row.tokenUsage ? JSON.parse(row.tokenUsage) : undefined
      }));
    } catch (error) {
      console.error('❌ Error loading all edits:', error);
      return [];
    }
  }

  // Get a specific edit by ID
  async getEditById(editId: string): Promise<SavedEdit | null> {
    try {
      await this.initDatabase();
      
      const result = await this.db!.getFirstAsync(
        `SELECT * FROM edits WHERE id = ?`,
        [editId]
      ) as any;

      if (!result) {
        return null;
      }

      return {
        id: result.id,
        designId: result.design_id,
        timestamp: result.timestamp,
        editInstructions: result.editInstructions,
        originalImage: result.originalImage,
        editedImage: result.editedImage,
        products: JSON.parse(result.products),
        tokenUsage: result.tokenUsage ? JSON.parse(result.tokenUsage) : undefined
      };
    } catch (error) {
      console.error('❌ Error loading edit by ID:', error);
      return null;
    }
  }

  // Get token usage statistics
  async getTokenUsageStats(): Promise<{
    totalGenerations: number;
    totalTokens: number;
    averageTokensPerGeneration: number;
    breakdown: {
      imageGeneration: number;
      textAnalysis: number;
    };
  }> {
    try {
      await this.initDatabase();
      
      const result = await this.db!.getAllAsync(
        `SELECT tokenUsage FROM designs WHERE tokenUsage IS NOT NULL`
      );

      let totalTokens = 0;
      let totalImageTokens = 0;
      let totalTextTokens = 0;
      let validEntries = 0;

      result.forEach((row: any) => {
        if (row.tokenUsage) {
          try {
            const tokenUsage = JSON.parse(row.tokenUsage);
            totalTokens += tokenUsage.grandTotal || 0;
            totalImageTokens += tokenUsage.imageGeneration?.totalTokens || 0;
            totalTextTokens += tokenUsage.textAnalysis?.totalTokens || 0;
            validEntries++;
          } catch (parseError) {
            console.warn('Failed to parse token usage:', parseError);
          }
        }
      });

      return {
        totalGenerations: validEntries,
        totalTokens,
        averageTokensPerGeneration: validEntries > 0 ? Math.round(totalTokens / validEntries) : 0,
        breakdown: {
          imageGeneration: totalImageTokens,
          textAnalysis: totalTextTokens
        }
      };
    } catch (error) {
      console.error('❌ Error getting token usage stats:', error);
      return {
        totalGenerations: 0,
        totalTokens: 0,
        averageTokensPerGeneration: 0,
        breakdown: {
          imageGeneration: 0,
          textAnalysis: 0
        }
      };
    }
  }
}

export const designStorage = new DesignStorage();
