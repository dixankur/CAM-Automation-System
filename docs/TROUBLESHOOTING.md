# 🔧 Troubleshooting Guide - CAM Automation System

## Issue: PowerShell Execution Policy Error

**Error Message:**
```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.
```

## ✅ Quick Solutions (Choose One)

### Solution 1: Use Command Prompt Instead
```cmd
cd C:\Users\Ankur\Downloads\CAM-Automation-System\services
npm install
node local-api-server.js
```

### Solution 2: Temporarily Allow PowerShell Scripts
```powershell
# Run PowerShell as Administrator, then:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Then try npm install again
```

### Solution 3: Bypass Execution Policy (One-time)
```powershell
powershell -ExecutionPolicy Bypass -Command "npm install"
```

### Solution 4: Use npx directly
```cmd
cd C:\Users\Ankur\Downloads\CAM-Automation-System\services
npx npm install
node local-api-server.js
```

## 🚀 Recommended Quick Start

1. **Open Command Prompt (cmd)** instead of PowerShell
2. Navigate to services directory:
   ```cmd
   cd C:\Users\Ankur\Downloads\CAM-Automation-System\services
   ```
3. Install dependencies:
   ```cmd
   npm install
   ```
4. Start the server:
   ```cmd
   node local-api-server.js
   ```
5. Open browser to: **http://localhost:3000**

## 📋 Manual Dependency Installation

If npm install still fails, you can install dependencies manually:

```cmd
npm install express@4.18.2
npm install cors@2.8.5
npm install multer@1.4.5-lts.1
npm install uuid@9.0.0
```

## 🔍 Verification Steps

After starting the server, you should see:
```
🚀 CAM Automation Local Server running on http://localhost:3000
📋 Available endpoints:
   GET  /health - Health check
   POST /upload - Upload CAM document
   ...
```

## 🌐 Test Server is Running

Open your browser and go to: **http://localhost:3000**

You should see the CAM Automation web interface.

## 🆘 Still Having Issues?

### Check Node.js Installation
```cmd
node --version
npm --version
```

### Check Port Availability
```cmd
netstat -ano | findstr :3000
```

### Alternative Port
If port 3000 is busy, edit `local-api-server.js` and change:
```javascript
const PORT = 3001; // or any other available port
```

## 📞 Common Error Solutions

### Error: "EADDRINUSE: address already in use"
```cmd
# Kill process using port 3000
netstat -ano | findstr :3000
taskkill /PID <process-id> /F
```

### Error: "Cannot find module"
```cmd
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Error: "Permission denied"
- Run Command Prompt as Administrator
- Or use a different directory with write permissions
