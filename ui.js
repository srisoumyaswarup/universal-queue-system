// CONFIGURATION - Update this with your info!
const GH_USERNAME = "srisoumyaswarup"; 
const REPO_NAME = "queue-saver-json"; 
const DATA_FILE = "queue.json";

// --- INITIALIZATION ---
window.onload = () => {
    // Detect which page we are on
    if (document.getElementById('citySearch')) {
        console.log("User Interface detected.");
    } else if (document.getElementById('adminId')) {
        console.log("Admin Dashboard detected.");
        loadAdminDropdown();
    }
};

// --- USER SEARCH FUNCTIONS ---
async function filterByCity() {
    const query = document.getElementById('citySearch').value.toLowerCase();
    const results = document.getElementById('results');
    results.innerHTML = "<p>Searching...</p>";

    try {
        const res = await fetch(`${DATA_FILE}?t=${Date.now()}`);
        const data = await res.json();
        const cityMatch = data.cities.find(c => c.name.toLowerCase() === query);

        results.innerHTML = "";
        if (cityMatch) {
            cityMatch.places.forEach(p => {
                results.innerHTML += `
                    <div class="card">
                        <h3>${p.name}</h3>
                        <div class="number">${p.currentNumber}</div>
                        <p>Currently Serving</p>
                        <a href="${p.formLink}" class="book-btn" target="_blank">Book Slot</a>
                    </div>`;
            });
        } else {
            results.innerHTML = "<p>City not found. Try 'Bengaluru' or 'Mumbai'.</p>";
        }
    } catch (e) {
        results.innerHTML = "<p>Error loading queue data.</p>";
    }
}

// --- ADMIN DASHBOARD FUNCTIONS ---
function validateLogin() {
    const id = document.getElementById('adminId').value;
    const token = document.getElementById('ghToken').value;

    // Basic check - true login is controlled by the GitHub Token's validity
    if (id === "admin" && token.startsWith("ghp_")) {
        document.getElementById('loginOverlay').style.display = "none";
        document.getElementById('adminDashboard').style.display = "block";
    } else {
        alert("Enter a valid Admin ID and GitHub Personal Access Token (starts with ghp_)");
    }
}

async function loadAdminDropdown() {
    const res = await fetch(`${DATA_FILE}?t=${Date.now()}`);
    const data = await res.json();
    const dropdown = document.getElementById('placeDropdown');
    
    data.cities.forEach(city => {
        city.places.forEach(p => {
            let opt = document.createElement('option');
            opt.value = `${city.name}|${p.id}`;
            opt.innerText = `${city.name} - ${p.name}`;
            dropdown.appendChild(opt);
        });
    });
}

async function submitUpdate() {
    const token = document.getElementById('ghToken').value;
    const [cityName, placeId] = document.getElementById('placeDropdown').value.split('|');
    const newNum = document.getElementById('nextNum').value;
    const status = document.getElementById('status');

    if (!newNum) return alert("Enter a new number");

    status.innerText = "Connecting to GitHub...";
    status.style.color = "orange";

    try {
        // 1. Get the latest file and its SHA (required for GitHub API updates)
        const apiURL = `https://api.github.com/repos/${GH_USERNAME}/${REPO_NAME}/contents/${DATA_FILE}`;
        const fileRes = await fetch(apiURL);
        const fileJSON = await fileRes.json();
        const currentData = JSON.parse(atob(fileJSON.content));

        // 2. Update the specific place in the JSON
        currentData.cities.find(c => c.name === cityName)
                   .places.find(p => p.id === placeId).currentNumber = parseInt(newNum);

        // 3. Send the update back to GitHub
        const updateRes = await fetch(apiURL, {
            method: 'PUT',
            headers: { 
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                message: `Admin update: ${cityName} - ${placeId} serving ${newNum}`,
                content: btoa(JSON.stringify(currentData, null, 2)),
                sha: fileJSON.sha
            })
        });

        if (updateRes.ok) {
            status.innerText = "✅ Successfully Updated Live Site!";
            status.style.color = "green";
        } else {
            status.innerText = "❌ Update Failed. Check token permissions.";
            status.style.color = "red";
        }
    } catch (e) {
        status.innerText = "❌ Network Error.";
        status.style.color = "red";
    }
}