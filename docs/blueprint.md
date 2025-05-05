# **App Name**: AccountBook Pro

## Core Features:

- User Authentication: Enable user authentication using Firebase Authentication (email/password, social login). Initial default username: Yousuf, password: Yousuf Shahid, with option to change after first login.
- User Profile Management: Allow users to create and manage profiles, storing user data in Firestore. Securely save and sync data to cloud with automatic backups and encryption in transit and at rest.
- UI for Auth and Dashboard: Implement a simple, intuitive user interface for login, registration, profile management, and main dashboard with account list (Add Account button, account details, view/edit/delete options).
- Account Details and Transactions: Display account details in a table (Number, Date, Description, Slip Number, Debit, Credit, Code). Implement duplicate slip number error message. Automatically post transactions to linked accounts specified in the 'Code' column, ensuring double-entry accounting. Implement Edit/Delete with confirmation prompts. 
- PDF Export Feature: Enable PDF export (Whole Account, Specific Line). Exclude 'Code' column in PDF.  Professionally formatted and downloadable PDF.
- Sharing Feature: Generate shareable link for live account view (read-only, excludes 'Code' column). Require recipient login with assigned credentials. Updates in real-time.
- Platform Support: Mobile app (Android/iOS) and responsive website. Seamless experience across all platforms with consistent data synchronization.
- Security Features: Implement security measures: Two-factor authentication (2FA), role-based access control, audit logs, protection against vulnerabilities, and compliance with financial data regulations.
- Advanced Features: Dashboard Analytics, Search Functionality, Multi-Currency Support, Templates, Import/Export, Notifications, Custom Fields, and Integration with tools like PayPal, Stripe, Google Drive.
- User Experience: Intuitive, modern, customizable interface (light/dark mode, adjustable font sizes). Tooltips/help section. Fast performance with efficient database design and caching.

## Style Guidelines:

- Primary color: Blue (#3498db) for trustworthiness and security.
- Secondary color: Light gray (#ecf0f1) for backgrounds and neutral elements.
- Accent: Green (#2ecc71) for success messages and positive actions.
- Clean and readable sans-serif fonts for optimal user experience.
- Use simple, recognizable icons for authentication-related actions (e.g., lock for password, user for profile).
- Clean and straightforward layout with clear visual hierarchy for easy navigation.
- Subtle animations for form transitions and loading states to enhance user experience.