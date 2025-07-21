# GithubActionsClient
Lightweight tests on manually configured GitHub actions. Command Line tool to create and run actions manually. Tests for average start and end times using mocha and chai test suites.

## Using the Tool
Users must have ngrok reverse proxy server installed (can be obtained through npm). Reserve your free static url and run the following command: ngrok http --domain=yourname.ngrok.io 3000 which will connect the express server to a temporary public facing link to test the webhook forwarding. Alternatively the project can be cloned, and one may run npm install --save-dev ngrok and use the package directly in the CLI prefixed with the npx command. 
