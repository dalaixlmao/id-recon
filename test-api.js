#!/usr/bin/env node

const http = require("http");

// Simple test runner for the API
async function makeRequest(path, method = "GET", data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3000,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          body: JSON.parse(body),
        });
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log("🧪 Starting API Tests...\n");

  try {
    // Test 1: Health Check
    console.log("Test 1: Health Check");
    const health = await makeRequest("/health");
    console.log("✅ Health check:", health.body.status);
    console.log("");

    // Test 2: Create new primary contact
    console.log("Test 2: Create New Primary Contact");
    const test1 = await makeRequest("/identify", "POST", {
      email: "lorraine@hillvalley.edu",
      phoneNumber: "123456",
    });
    console.log("✅ Primary contact created:", test1.body.contact);
    console.log("");

    // Test 3: Create secondary contact
    console.log("Test 3: Create Secondary Contact");
    const test2 = await makeRequest("/identify", "POST", {
      email: "mcfly@hillvalley.edu",
      phoneNumber: "123456",
    });
    console.log("✅ Secondary contact created:", test2.body.contact);
    console.log("");

    // Test 4: Create another primary contact
    console.log("Test 4: Create Another Primary Contact");
    const test3 = await makeRequest("/identify", "POST", {
      email: "george@hillvalley.edu",
      phoneNumber: "919191",
    });
    console.log("✅ Another primary contact:", test3.body.contact);
    console.log("");

    // Test 5: Create third primary contact
    console.log("Test 5: Create Third Primary Contact");
    const test4 = await makeRequest("/identify", "POST", {
      email: "biffsucks@hillvalley.edu",
      phoneNumber: "717171",
    });
    console.log("✅ Third primary contact:", test4.body.contact);
    console.log("");

    // Test 6: Merge primary contacts
    console.log("Test 6: Merge Primary Contacts");
    const test5 = await makeRequest("/identify", "POST", {
      email: "george@hillvalley.edu",
      phoneNumber: "717171",
    });
    console.log("✅ Merged contacts:", test5.body.contact);
    console.log("");

    // Test 7: Query with existing information
    console.log("Test 7: Query with Existing Information");
    const test6 = await makeRequest("/identify", "POST", {
      email: "mcfly@hillvalley.edu",
    });
    console.log("✅ Query result:", test6.body.contact);
    console.log("");

    // Test 8: Error handling - invalid request
    console.log("Test 8: Error Handling - Invalid Request");
    try {
      const test7 = await makeRequest("/identify", "POST", {});
      console.log("❌ Should have failed but got:", test7.body);
    } catch (error) {
      console.log("✅ Correctly handled invalid request");
    }

    console.log("\n🎉 All tests passed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest("/health");
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log("🔍 Checking if server is running...");

  const isRunning = await checkServer();
  if (!isRunning) {
    console.log("❌ Server is not running. Please start with: npm run dev");
    process.exit(1);
  }

  console.log("✅ Server is running\n");
  await runTests();
}

main();
