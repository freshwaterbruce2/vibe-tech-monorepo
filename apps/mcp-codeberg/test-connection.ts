import axios from "axios";

const BASE_URL = "https://codeberg.org/api/v1";

async function testSearch() {
  console.log("Testing Codeberg Repo Search...");
  try {
    const response = await axios.get(`${BASE_URL}/repos/search`, {
      params: { q: "mcp", limit: 1 },
    });
    console.log("Search Result:", response.data.data.length > 0 ? "Success" : "No results (but success)");
    if (response.data.data.length > 0) {
        console.log("First repo:", response.data.data[0].full_name);
    }
  } catch (error: any) {
    console.error("Search Failed:", error.message);
  }
}

async function testGetRepo() {
    console.log("\nTesting Get Repo Details (forgejo/forgejo)...");
    try {
        const response = await axios.get(`${BASE_URL}/repos/forgejo/forgejo`);
        console.log("Repo Details:", response.data.full_name, "Stars:", response.data.stars_count);
    } catch (error: any) {
        console.error("Get Repo Failed:", error.message);
    }
}

async function main() {
    await testSearch();
    await testGetRepo();
}

main();
