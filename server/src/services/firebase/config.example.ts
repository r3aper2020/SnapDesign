/**
 * Firebase Service Configuration Example
 * Copy this file to config.ts and update the values
 */

export const firebaseConfig = {
    // Firebase Project Settings
    project: {
        id: 'your-firebase-project-id',
        number: 'your-project-number', // Found in Firebase Console
        webApiKey: 'your-firebase-web-api-key',
        appId: '1:your-project-number:web:your-app-id', // Found in Firebase Console
    },

    // Firebase Database Configuration
    database: {
        url: 'https://your-project-id.firebaseio.com', // Optional: Custom database URL
    },

    // Firebase Auth Domain (auto-generated)
    get authDomain() {
        return `${this.project.id}.firebaseapp.com`;
    },

    // Firebase Storage Bucket (auto-generated)
    get storageBucket() {
        return `${this.project.id}.appspot.com`;
    }
};
