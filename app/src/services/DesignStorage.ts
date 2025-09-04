import * as SQLite from 'expo-sqlite';

export interface SavedDesign {
  id: string;
  timestamp: number;
  description: string;
  originalImage: string;
  generatedImage: string;
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
}

const DB_NAME = 'designs.db';

class DesignStorage {
  private db: SQLite.SQLiteDatabase | null = null;

  private async initDatabase(): Promise<void> {
    if (this.db) return;
    
    this.db = await SQLite.openDatabaseAsync(DB_NAME);
    
    // Create tables if they don't exist
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS designs (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        description TEXT NOT NULL,
        originalImage TEXT NOT NULL,
        generatedImage TEXT NOT NULL,
        products TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS checkbox_states (
        design_id TEXT PRIMARY KEY,
        checked_items TEXT NOT NULL,
        FOREIGN KEY (design_id) REFERENCES designs (id) ON DELETE CASCADE
      );
    `);
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
        `INSERT INTO designs (id, timestamp, description, originalImage, generatedImage, products) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          savedDesign.id,
          savedDesign.timestamp,
          savedDesign.description,
          savedDesign.originalImage,
          savedDesign.generatedImage,
          JSON.stringify(savedDesign.products)
        ]
      );

      console.log('💾 Design saved to database:', {
        id: savedDesign.id,
        description: savedDesign.description,
        productsCount: savedDesign.products.length,
        originalImageSize: savedDesign.originalImage.length,
        generatedImageSize: savedDesign.generatedImage.length
      });
      return savedDesign;
    } catch (error) {
      console.error('❌ Error saving design:', error);
      throw new Error('Failed to save design');
    }
  }

  // Get all saved designs
  async getSavedDesigns(): Promise<SavedDesign[]> {
    try {
      await this.initDatabase();
      
      const result = await this.db!.getAllAsync(
        `SELECT * FROM designs ORDER BY timestamp DESC`
      );

      const designs = result.map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp,
        description: row.description,
        originalImage: row.originalImage,
        generatedImage: row.generatedImage,
        products: JSON.parse(row.products)
      }));

      console.log('📚 Loaded designs from database:', {
        count: designs.length,
        designs: designs.map(d => ({
          id: d.id,
          description: d.description,
          productsCount: d.products.length,
          timestamp: new Date(d.timestamp).toLocaleString()
        }))
      });

      return designs;
    } catch (error) {
      console.error('❌ Error loading designs:', error);
      return [];
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
      );

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
      );

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
}

export const designStorage = new DesignStorage();
