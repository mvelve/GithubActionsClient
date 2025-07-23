# 🧪 GithubActionsClient

A lightweight CLI tool for manually configuring and testing GitHub Actions workflows.  
It supports measuring upload throughput and verifying webhook triggers using a local Express server and `ngrok`.

## ✅ Features
- Manually create and run GitHub Actions workflows
- Track average upload start and end times
- Fetch throughput metrics via API
- Test suite included using Mocha and Chai

## 🔧 Prerequisites
- [Node.js](https://nodejs.org/)
- [ngrok](https://ngrok.com/)
- `ts-node`, `typescript`, `express`, `dotenv` (see `package.json`)

## 📦 Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/GithubActionsClient.git
cd GithubActionsClient
npm install
```

Install `ngrok` globally (or use locally via `npx`):

```bash
npm install --save-dev ngrok
```

## 🚀 Running the Tool

### 1. Start the Express server
Navigate to the proxy server directory and start the app:

```bash
cd src/ProxyServer
ts-node app.ts
```

Alternatively, from the root directory:

```bash
npm run dev
```

### 2. Expose your local server using ngrok
Start ngrok with your chosen subdomain (must be reserved in your ngrok account):

```bash
ngrok http --domain=yourname.ngrok.io 3000
```

This will expose your local Express server on a public URL like:

```
https://yourname.ngrok.io
```

### 3. Use the CLI
Run the CLI tool from the root directory:

```bash
npm run dev
```

Answer the prompts as instructed.

### 4. Retrieve Throughput Data
After uploading test files, retrieve the throughput results by making a `GET` request to:

```
https://yourname.ngrok.io/webhooks/pushEvents/throughputs
```

This returns throughput metrics (in MB/s) for each successfully recorded file upload.

## ⚠️ Known Limitation
**Race Condition**  
There is a known race condition where large files may not appear in the `/throughputs` response immediately due to webhook timing.

**Workaround**: Introduce a short delay before calling `/throughputs`, or poll until the most recent entry is finalized.

## 🧪 Testing
Run Mocha + Chai tests using:

```bash
npm test
```

These tests validate average upload durations and response correctness.

## 📬 Example API Usage

```bash
curl https://yourname.ngrok.io/webhooks/pushEvents/throughputs
```

Sample response:

```json
[
  {
    "uploadStart": 1753277927180,
    "uploadEnd": 1753277929325,
    "mbFileSize": 4,
    "throughputMBps": 1.864
  }
]
```

## 📂 Project Structure

```
GithubActionsClient/
├── src/
│   └── ProxyServer/
│       ├── app.ts
│       └── Controllers/
│           ├── commitResponseValidation.ts
│           └── originValidation.ts
├── test/
│   └── throughput.test.ts
├── package.json
└── README.md
```

## 📄 License
MIT

