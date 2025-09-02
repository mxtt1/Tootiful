1) Clone the repository on local device
2) cd backend
3) npm install
4) Set up local connection of mySQL database, through mySQL workbench if you have. If you need help just message the group
  
6) Create .env file:
    # Database Configuration
    DATABASE_URL=[replace with your own database config string]

    # Application Configuration
    PORT=3000
    NODE_ENV=development
    
    # Database Cleanup Configuration
    DROP_ORPHANED_TABLES=true

7) npm run test --> The server should be running on whichever port you specified in the .env file

NOTE: JWT authentication is not set up yet. The student and tutor login endpoints exist with email and password validation, but they dont actually do anything on successful login except return a success status.

For frontend please create a separate frontend folder and set up a React App (probably using VITE)
